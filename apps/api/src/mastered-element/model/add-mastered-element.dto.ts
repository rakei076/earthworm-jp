import { Type } from "class-transformer";
import { IsNotEmpty, IsObject, ValidateNested } from "class-validator";

class ContentDto {
  @IsNotEmpty()
  japanese: string;
}

export class AddMasteredElementDto {
  @IsObject()
  @ValidateNested()
  @Type(() => ContentDto)
  content: ContentDto;
}
