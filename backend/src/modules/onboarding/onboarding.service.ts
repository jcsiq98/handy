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

      // Update application with photo URLs
      await this.prisma.providerApplication.update({
        where: { id: applicationId },
        data: {
          inePhotoFront: ineFrontUrl,
          inePhotoBack: ineBackUrl,
          selfiePhoto: selfieUrl,
          verificationStatus: 'DOCS_SUBMITTED',
        },
      });

      this.logger.log(
        `Verification photos uploaded for application ${applicationId}`,
      );
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
   * Get verification URL for an application
   */
  getVerificationUrl(token: string): string {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    return `${frontendUrl}/verify/${token}`;
  }
}

