import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
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
  create(@Request() req: any, @Body() dto: CreateSightingDto) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.sightingsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "postId別の目撃情報一覧を取得する" })
  @ApiQuery({ name: "postId", required: true })
  findByPost(@Query("postId") postId: string) {
    return this.sightingsService.findByPost(postId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "目撃情報を削除する（本人または管理者）" })
  @ApiResponse({ status: 204 })
  remove(@Request() req: any, @Param("id") id: string) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.sightingsService.remove(userId, id);
  }

  @Post(":id/favorite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "目撃情報のお気に入りをトグルする" })
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
