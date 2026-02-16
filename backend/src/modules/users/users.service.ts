import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { providerProfile: true },
    });
  }

  async createCustomer(phone: string, name?: string) {
    return this.prisma.user.create({
      data: {
        phone,
        name,
        role: 'CUSTOMER',
      },
    });
  }

  async updateProfile(id: string, data: { name?: string; email?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}

