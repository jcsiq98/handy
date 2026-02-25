import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Providers')
@Controller('api/providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List providers, optionally filtered by category' })
  @ApiQuery({ name: 'category', required: false, description: 'Category slug (e.g. plumbing)' })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'Latitude for distance sorting' })
  @ApiQuery({ name: 'lng', required: false, type: Number, description: 'Longitude for distance sorting' })
  @ApiQuery({ name: 'sort', required: false, enum: ['rating', 'distance', 'jobs'], description: 'Sort order' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  async listProviders(
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.providersService.listProviders({
      category: category || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      sortBy: (sort as 'rating' | 'distance' | 'jobs') || 'rating',
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get full provider profile with recent reviews' })
  async getProviderDetail(@Param('id') id: string) {
    const provider = await this.providersService.getProviderDetail(id);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return provider;
  }

  @Get(':id/reviews')
  @Public()
  @ApiOperation({ summary: 'Get paginated reviews for a provider' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Reviews per page (default 10)' })
  async getProviderReviews(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const reviews = await this.providersService.getProviderReviews(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
    if (!reviews) {
      throw new NotFoundException('Provider not found');
    }
    return reviews;
  }
}


