import {
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
import {
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
} from "../common/openapi-examples";
import { CreateSightingDto } from "./dto/create-sighting.dto";
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
  create(@Request() req: any, @Body() dto: CreateSightingDto) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.sightingsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "postId別の目撃情報一覧を取得する" })
  @ApiQuery({
    name: "postId",
    required: true,
    example: OPENAPI_POST_ID_EXAMPLE,
  })
  findByPost(@Query("postId") postId: string) {
    return this.sightingsService.findByPost(postId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "目撃情報を削除する（本人または管理者）" })
  @ApiParam({ name: "id", example: OPENAPI_SIGHTING_ID_EXAMPLE })
  @ApiResponse({ status: 204 })
  remove(@Request() req: any, @Param("id") id: string) {
    const userId = req.user?.id ?? req.user?.userId;
    const isAdmin = req.user?.role === "admin";
    return this.sightingsService.remove(userId, id, isAdmin);
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
  async toggleFavorite(@Request() req: any, @Param("id") id: string) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.sightingsService.toggleFavorite(userId, id);
  }
}
