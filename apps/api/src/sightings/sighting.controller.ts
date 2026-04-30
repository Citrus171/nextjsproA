import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";
import {
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
} from "../common/openapi-examples";
import { CreateSightingDto } from "./dto/create-sighting.dto";
import { SightingResponseDto } from "./dto/sighting-response.dto";
import { SightingsService } from "./sighting.service";

@ApiTags("sightings")
@Controller("sightings")
export class SightingsController {
  constructor(private readonly sightingsService: SightingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "目撃情報を作成する" })
  @ApiBody({
    schema: {
      type: "object",
      example: {
        postId: OPENAPI_POST_ID_EXAMPLE,
        lat: 35.8617,
        lng: 139.6455,
        address: "Saitama City, Urawa-ku",
        sightedAt: "2024-01-02T00:00:00.000Z",
        comment: "Seed sighting",
      },
    },
  })
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateSightingDto) {
    return this.sightingsService.create(req.user.id, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "目撃情報の詳細を取得する" })
  @ApiParam({ name: "id", example: OPENAPI_SIGHTING_ID_EXAMPLE })
  @ApiResponse({ status: 200, type: SightingResponseDto })
  @ApiResponse({ status: 404, description: "目撃情報が見つかりません" })
  findOne(@Param("id") id: string) {
    return this.sightingsService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: "postId別の目撃情報一覧を取得する" })
  @ApiQuery({
    name: "postId",
    required: true,
    example: OPENAPI_POST_ID_EXAMPLE,
  })
  @ApiResponse({ status: 200, type: [SightingResponseDto] })
  findByPost(@Query("postId") postId: string) {
    if (!postId) throw new BadRequestException("postIdは必須です");
    return this.sightingsService.findByPost(postId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "目撃情報を削除する（本人または管理者）" })
  @ApiParam({ name: "id", example: OPENAPI_SIGHTING_ID_EXAMPLE })
  @ApiResponse({ status: 204 })
  remove(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.sightingsService.remove(
      req.user.id,
      id,
      req.user.role === "admin"
    );
  }

  @Post(":id/favorite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "目撃情報のお気に入りをトグルする" })
  @ApiParam({ name: "id", example: OPENAPI_SIGHTING_ID_EXAMPLE })
  @ApiResponse({
    status: 201,
    schema: { properties: { favorited: { type: "boolean" } } },
  })
  @ApiResponse({ status: 400, description: "お気に入り上限超過" })
  @ApiResponse({ status: 404, description: "Sighting not found" })
  async toggleFavorite(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.sightingsService.toggleFavorite(req.user.id, id);
  }
}
