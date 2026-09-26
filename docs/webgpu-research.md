# Исследование WebGPU

## Решение
WebGL 2 — основной renderer. WebGPU — только экспериментальная проверка (`?renderer=webgpu`, `src/scene/webgpu.ts`).

## Причины
- WebXR Device API в браузерах шлемов (в т.ч. VIVE Browser на Focus 3) работает через `XRWebGLLayer`; модуль WebXR/WebGPU Binding ещё экспериментальный.
- Babylon.js `WebGPUEngine` поддерживает desktop-рендер, но immersive-vr сессия требует WebGL-контекст.
- Сцена low-poly (цель до 150 000 треугольников, простые PBR-материалы): узкое место — fill rate и число draw calls, а не API.

## Что даст WebGPU в будущем
- Меньше накладных расходов CPU на draw call, compute shaders.
- Имеет смысл переходить, когда WebXR/WebGPU Binding станет стабильным в браузере шлема.

## Проверка
`detectWebGPU()` безопасно проверяет `navigator.gpu.requestAdapter()`; при отсутствии адаптера или ошибке используется WebGL.
