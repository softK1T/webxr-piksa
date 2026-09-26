from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Vec3 = tuple[float, float, float]
IDENTIFIER = r"^[A-Za-z0-9_-]+$"


class SceneObject(BaseModel):
    id: str = Field(min_length=1, max_length=64, pattern=IDENTIFIER)
    model: str = Field(min_length=1, max_length=64, pattern=IDENTIFIER)
    source: Literal["builtin", "uploaded"] = "builtin"
    position: Vec3 = (0.0, 0.0, 0.0)
    rotation: Vec3 = (0.0, 0.0, 0.0)
    scale: Vec3 = (1.0, 1.0, 1.0)

    @field_validator("position")
    @classmethod
    def _position_in_bounds(cls, value: Vec3) -> Vec3:
        if any(abs(v) > 50 for v in value):
            raise ValueError("position must be within 50 m of the origin")
        return value

    @field_validator("scale")
    @classmethod
    def _scale_positive(cls, value: Vec3) -> Vec3:
        if any(v <= 0 or v > 10 for v in value):
            raise ValueError("scale must be in (0, 10]")
        return value


class SceneIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    version: int = 1
    objects: list[SceneObject] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def _unique_ids(self) -> "SceneIn":
        ids = [obj.id for obj in self.objects]
        if len(ids) != len(set(ids)):
            raise ValueError("object ids must be unique")
        return self


class SceneOut(SceneIn):
    id: int


class SceneSummary(BaseModel):
    id: int
    name: str
    objects: int


class ModelInfo(BaseModel):
    meshes: int
    triangles: int
    materials: int


class ModelOut(ModelInfo):
    model_config = ConfigDict(from_attributes=True)

    name: str
    size: int
