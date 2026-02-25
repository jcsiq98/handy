import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  /**
   * List providers, optionally filtered by category slug.
   * Supports sorting by rating (default), distance, or totalJobs.
   * Supports pagination via limit/offset.
   */
  async listProviders(options: {
    category?: string;
    lat?: number;
    lng?: number;
    sortBy?: 'rating' | 'distance' | 'jobs';
    limit?: number;
    offset?: number;
  }) {
    const { category, lat, lng, sortBy = 'rating', limit = 20, offset = 0 } = options;

    // Build where clause
    const where: Prisma.ProviderProfileWhereInput = {
      user: { isActive: true },
    };

    // Filter by category slug if provided
    if (category) {
      where.serviceTypes = { array_contains: [category] };
    }

    // Determine ordering
    let orderBy: Prisma.ProviderProfileOrderByWithRelationInput[] = [
      { isVerified: 'desc' },
    ];

    switch (sortBy) {
      case 'jobs':
        orderBy.push({ totalJobs: 'desc' });
        break;
      case 'rating':
      default:
        orderBy.push({ user: { ratingAverage: 'desc' } });
        break;
      // 'distance' sorting is done post-query since Prisma doesn't support geospatial
    }

    const [providers, total] = await Promise.all([
      this.prisma.providerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              ratingAverage: true,
              ratingCount: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.providerProfile.count({ where }),
    ]);

    let result = providers.map((p) => {
      const item: Record<string, unknown> = {
        id: p.id,
        userId: p.user.id,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        bio: p.bio,
        serviceTypes: p.serviceTypes,
        ratingAverage: p.user.ratingAverage,
        ratingCount: p.user.ratingCount,
        totalJobs: p.totalJobs,
        isVerified: p.isVerified,
        isAvailable: p.isAvailable,
        locationLat: p.locationLat,
        locationLng: p.locationLng,
      };

      // Calculate distance if coordinates provided
      if (lat !== undefined && lng !== undefined && p.locationLat && p.locationLng) {
        item.distance = this.haversineDistance(lat, lng, p.locationLat, p.locationLng);
      }

      return item;
    });

    // Sort by distance if requested and coordinates available
    if (sortBy === 'distance' && lat !== undefined && lng !== undefined) {
      result.sort((a, b) => {
        const distA = (a.distance as number) ?? Infinity;
        const distB = (b.distance as number) ?? Infinity;
        return distA - distB;
      });
    }

    return {
      data: result,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get full provider profile including recent reviews.
   */
  async getProviderDetail(providerId: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            ratingAverage: true,
            ratingCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!provider) return null;

    // Get recent reviews (last 10)
    const reviews = await this.prisma.rating.findMany({
      where: { toUserId: provider.user.id },
      include: {
        fromUser: {
          select: { name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Map category slugs to display names
    const categoryNames = await this.getCategoryNames(
      provider.serviceTypes as string[],
    );

    return {
      id: provider.id,
      userId: provider.user.id,
      name: provider.user.name,
      avatarUrl: provider.user.avatarUrl,
      bio: provider.bio,
      serviceTypes: provider.serviceTypes,
      serviceNames: categoryNames,
      ratingAverage: provider.user.ratingAverage,
      ratingCount: provider.user.ratingCount,
      totalJobs: provider.totalJobs,
      isVerified: provider.isVerified,
      isAvailable: provider.isAvailable,
      locationLat: provider.locationLat,
      locationLng: provider.locationLng,
      memberSince: provider.user.createdAt,
      reviews: reviews.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        customerName: this.maskName(r.fromUser.name),
        customerAvatar: r.fromUser.avatarUrl,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * Get paginated reviews for a provider.
   */
  async getProviderReviews(
    providerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // First get the user ID from the provider profile
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });

    if (!provider) return null;

    const offset = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.rating.findMany({
        where: { toUserId: provider.userId },
        include: {
          fromUser: {
            select: { name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.rating.count({
        where: { toUserId: provider.userId },
      }),
    ]);

    return {
      data: reviews.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        customerName: this.maskName(r.fromUser.name),
        customerAvatar: r.fromUser.avatarUrl,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Resolve category slugs → display names.
   */
  private async getCategoryNames(slugs: string[]): Promise<Record<string, string>> {
    if (!slugs || slugs.length === 0) return {};

    const categories = await this.prisma.serviceCategory.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, name: true, icon: true },
    });

    const map: Record<string, string> = {};
    for (const cat of categories) {
      map[cat.slug] = `${cat.icon} ${cat.name}`;
    }
    return map;
  }

  /**
   * Mask customer name for privacy: "Ana Martínez" → "Ana M."
   */
  private maskName(name: string | null): string {
    if (!name) return 'Cliente';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  }

  /**
   * Haversine formula — distance in km between two lat/lng points.
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}


