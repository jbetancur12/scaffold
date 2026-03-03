# Modulo de Consumo de Hilo

Endpoint:

- `POST /api/mrp/thread-consumption/calculate`

Objetivo:

- estimar metros de hilo requeridos por orden de produccion considerando tipo de puntada, longitud de costura, numero de agujas, densidad de puntadas, retrabajo, desperdicio y perdida de alistamiento.

## Variables de entrada

- `plannedUnits`: unidades a producir.
- `operations[]`: operaciones de costura.
- `operations[].stitchType`: `101 | 301 | 401 | 406 | 503 | 504 | 512 | 516 | 602 | 605 | custom`.
- `operations[].seamLengthCm`: longitud de costura por unidad (contorno o tramo).
- `operations[].seamsPerUnit`: cuantas veces se repite esa costura en una unidad.
- `operations[].stitchesPerCm`: densidad de puntada real.
- `operations[].needles`: agujas de la maquina (override).
- `operations[].machineCount`: maquinas para esa operacion (se usa para distribuir sugerido por maquina).
- `operations[].seamThicknessFactor`: ajuste por espesor/capas (1.0 base).
- `operations[].startEndAllowanceCm`: consumo extra por remates e inicio/fin de costura.
- `operations[].reworkPercent`: porcentaje de retrabajo.
- `wastePercent`: desperdicio global.
- `setupLossPercent`: perdida global por alistamiento/pruebas.
- `coneLengthMeters`: metros por cono.

## Formula aplicada

Por operacion:

1. `totalSeamCm = plannedUnits * seamsPerUnit * (seamLengthCm + startEndAllowanceCm) * (1 + reworkPercent/100)`
2. `effectiveRatio = baseRatioByStitch * (stitchesPerCm / referenceStitchesPerCm) * seamThicknessFactor`
3. `threadMeters = (totalSeamCm * effectiveRatio) / 100`

Totales:

1. `preLossMeters = sum(threadMeters)`
2. `totalMeters = preLossMeters * (1 + wastePercent/100) * (1 + setupLossPercent/100)`
3. `conesNeeded = totalMeters / coneLengthMeters`

## Fuentes tecnicas usadas

- Coats, guia de estimacion de consumo de hilo por clase de puntada:
  - https://www.coats.com/en/info-hub/thread-consumption-guide/
- American & Efird (A&E), factores y enfoque de consumo por puntada:
  - https://www.amefird.com/wp-content/uploads/2023/04/anec28.pdf

Notas:

- Los ratios base por puntada son aproximaciones tecnicas para planeacion.
- Para mejorar precision conviene calibrar con corridas reales por referencia y ajustar `threadRatioCmPerCm` o `seamThicknessFactor`.
