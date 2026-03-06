import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { ConfigService } from '@nestjs/config';

interface VerificationTokenPayload {
  applicationId: string;
  phone: string;
  type: 'verification';
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cloudinary: CloudinaryService,
    private config: ConfigService,
  ) {}

  /**
   * Generate a temporary verification token for an application
   */
  async generateVerificationToken(applicationId: string): Promise<string> {
    const application = await this.prisma.providerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Application already approved');
    }

    const payload: VerificationTokenPayload = {
      applicationId,
      phone: application.phone,
      type: 'verification',
    };

    const token = this.jwt.sign(payload, { expiresIn: '1h' });
    this.logger.log(`Generated verification token for application ${applicationId}`);
    return token;
  }

  /**
   * Verify a token and return application info
   */
  async verifyToken(token: string): Promise<{
    applicationId: string;
    phone: string;
    name: string | null;
  }> {
    try {
      const payload = this.jwt.verify<VerificationTokenPayload>(token);

      if (payload.type !== 'verification') {
        throw new UnauthorizedException('Invalid token type');
      }

      const application = await this.prisma.providerApplication.findUnique({
        where: { id: payload.applicationId },
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      if (application.verificationStatus === 'APPROVED') {
        throw new BadRequestException('Application already approved');
      }

      return {
        applicationId: application.id,
        phone: application.phone,
        name: application.name,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Verification token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid verification token');
      }
      throw error;
    }
  }

  /**
   * Upload verification photos (INE front, back, selfie)
   * For MVP: auto-approves and creates User + ProviderProfile after upload.
   */
  async uploadVerificationPhotos(
    applicationId: string,
    ineFront: Express.Multer.File,
    ineBack: Express.Multer.File,
    selfie: Express.Multer.File,
  ): Promise<void> {
    const application = await this.prisma.providerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Application already approved');
    }

    try {
      // Upload photos to Cloudinary
      const [ineFrontUrl, ineBackUrl, selfieUrl] = await Promise.all([
        this.cloudinary.uploadPhoto(
          ineFront.buffer,
          'verification/ine',
          `ine-front-${applicationId}`,
        ),
        this.cloudinary.uploadPhoto(
          ineBack.buffer,
          'verification/ine',
          `ine-back-${applicationId}`,
        ),
        this.cloudinary.uploadPhoto(
          selfie.buffer,
          'verification/selfie',
          `selfie-${applicationId}`,
        ),
      ]);

      // Update application with photo URLs and AUTO-APPROVE (MVP)
      await this.prisma.providerApplication.update({
        where: { id: applicationId },
        data: {
          inePhotoFront: ineFrontUrl,
          inePhotoBack: ineBackUrl,
          selfiePhoto: selfieUrl,
          verificationStatus: 'APPROVED', // MVP: auto-approve
        },
      });

      this.logger.log(
        `Verification photos uploaded for application ${applicationId}`,
      );

      // MVP: Auto-create User + ProviderProfile
      await this.autoApproveProvider(application);
    } catch (error: any) {
      this.logger.error(
        `Failed to upload verification photos: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to upload photos: ${error.message}`,
      );
    }
  }

  /**
   * MVP: Auto-approve a provider application — creates User + ProviderProfile.
   * In the future, this will be triggered by admin review instead.
   */
  private async autoApproveProvider(
    application: {
      id: string;
      phone: string;
      name: string | null;
      bio: string | null;
      categories: string[];
      serviceZones: string[];
      yearsExperience: number | null;
    },
  ): Promise<void> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: application.phone },
      });

      if (existingUser) {
        this.logger.log(
          `User already exists for ${application.phone}, skipping creation`,
        );
        return;
      }

      // Create User + ProviderProfile in a transaction
      const user = await this.prisma.user.create({
        data: {
          phone: application.phone,
          name: application.name,
          role: 'PROVIDER',
          providerProfile: {
            create: {
              bio: application.bio,
              serviceTypes: application.categories || [],
              isVerified: true,
              isAvailable: true,
            },
          },
        },
        include: { providerProfile: true },
      });

      // Link service zones if available
      if (user.providerProfile && application.serviceZones?.length > 0) {
        // Find existing zones that match
        const zones = await this.prisma.serviceZone.findMany({
          where: {
            name: { in: application.serviceZones },
          },
        });

        if (zones.length > 0) {
          await this.prisma.providerServiceZone.createMany({
            data: zones.map((zone) => ({
              providerId: user.providerProfile!.id,
              zoneId: zone.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      this.logger.log(
        `✅ Auto-approved provider: ${application.name} (${application.phone}) — User + Profile created`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to auto-approve provider ${application.phone}: ${error.message}`,
        error.stack,
      );
      // Don't throw — photos are already uploaded, approval can be retried
    }
  }

  /**
   * Get verification URL for an application
   */
  getVerificationUrl(token: string): string {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    return `${frontendUrl}/verify/${token}`;
  }
}

