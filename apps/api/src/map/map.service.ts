import { Injectable } from "@nestjs/common";
import { MarkerDto } from "./dto/marker-response.dto";

@Injectable()
export class MapService {
  getMarkers(): MarkerDto[] {
    return [
      {
        lat: 35.9062,
        lng: 139.6236,
        title: "大宮駅",
        description:
          "埼玉県さいたま市大宮区にあるJR東日本・東武鉄道の主要駅。新幹線（東北・上越・北陸）が停車し、埼玉県最大の交通拠点。",
        imageUrl: "/omiya-station.jpg",
      },
    ];
  }
}
