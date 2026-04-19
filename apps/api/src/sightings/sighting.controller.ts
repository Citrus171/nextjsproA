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
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateSightingDto
  ) {
    return this.sightingsService.create(req.user.userId, dto);
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
  @ApiOperation({ summary: "目撃情報を削除する（本人のみ）" })
  @ApiResponse({ status: 204 })
  remove(
    @Request() req: { user: { userId: string } },
    @Param("id") id: string
  ) {
    return this.sightingsService.remove(req.user.userId, id);
  }
}
