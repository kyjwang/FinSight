import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { Candle, Forecast } from "@/types";
import { colors } from "@/lib/theme";
import { compactNumber } from "@/lib/format";

type Props = {
  candles: Candle[];
  forecast?: Forecast;
  height?: number;
};

export function CandlestickChart({ candles, forecast, height = 190 }: Props) {
  if (candles.length === 0) {
    return (
      <View style={[styles.container, styles.empty, { height }]}>
        <Svg width="100%" height={height} viewBox="0 0 340 190">
          <SvgText x={170} y={95} fill={colors.muted} fontSize={13} fontWeight="700" textAnchor="middle">
            Chart data unavailable
          </SvgText>
        </Svg>
      </View>
    );
  }

  const width = 340;
  const chartPadding = 16;
  const priceLabelWidth = 44;
  const plotTop = 16;
  const plotBottom = height - 58;
  const volumeTop = height - 42;
  const volumeBottom = height - 18;
  const xAxisY = height - 7;
  const forecastPoints = forecast?.points ?? [];
  const values = [
    ...candles.flatMap((candle) => [candle.high, candle.low]),
    ...forecastPoints.flatMap((point) => [point.upper, point.lower])
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const totalPoints = candles.length + forecastPoints.length;
  const plotWidth = width - chartPadding - priceLabelWidth;
  const candleWidth = Math.max(2.5, plotWidth / totalPoints - 3);
  const candleStep = plotWidth / Math.max(1, totalPoints - 1);
  const maxVolume = Math.max(...candles.map((candle) => candle.volume), 1);

  const y = (value: number) => plotTop + ((max - value) / range) * (plotBottom - plotTop);
  const x = (index: number) => chartPadding + index * candleStep;
  const forecastX = (index: number) => x(candles.length + index);
  const priceTicks = [max, min + range / 2, min];
  const dateTicks = buildDateTicks(candles);

  const meanPath = forecastPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${forecastX(index)} ${y(point.mean)}`)
    .join(" ");
  const upperPath = forecastPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${forecastX(index)} ${y(point.upper)}`)
    .join(" ");
  const lowerPath = forecastPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${forecastX(index)} ${y(point.lower)}`)
    .join(" ");

  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {priceTicks.map((tick) => (
          <G key={tick}>
            <Line
              x1={chartPadding}
              x2={width - priceLabelWidth + 6}
              y1={y(tick)}
              y2={y(tick)}
              stroke={colors.border}
              strokeDasharray="4 6"
              strokeWidth={1}
            />
            <SvgText
              x={width - priceLabelWidth + 10}
              y={y(tick) + 4}
              fill={colors.muted}
              fontSize={9}
              fontWeight="700"
            >
              {formatChartPrice(tick)}
            </SvgText>
          </G>
        ))}

        <Line
          x1={chartPadding}
          x2={width - priceLabelWidth + 6}
          y1={volumeTop}
          y2={volumeTop}
          stroke={colors.border}
          strokeWidth={1}
        />

        {candles.map((candle, index) => {
          const fill = candle.close >= candle.open ? colors.green : colors.red;
          const centerX = x(index);
          const barHeight = Math.max(1, (candle.volume / maxVolume) * (volumeBottom - volumeTop));
          return (
            <Rect
              key={`${candle.time}-volume-${index}`}
              x={centerX - candleWidth / 2}
              y={volumeBottom - barHeight}
              width={candleWidth}
              height={barHeight}
              rx={1}
              fill={fill}
              opacity={0.32}
            />
          );
        })}

        <SvgText x={width - priceLabelWidth + 10} y={volumeTop + 11} fill={colors.muted} fontSize={8} fontWeight="700">
          Vol
        </SvgText>
        <SvgText x={width - priceLabelWidth + 10} y={volumeBottom} fill={colors.muted} fontSize={8} fontWeight="700">
          {compactNumber(maxVolume)}
        </SvgText>

        {dateTicks.map((tick) => (
          <SvgText
            key={`${tick.label}-${tick.index}`}
            x={x(tick.index)}
            y={xAxisY}
            fill={colors.muted}
            fontSize={8}
            fontWeight="700"
            textAnchor={tick.anchor}
          >
            {tick.label}
          </SvgText>
        ))}

        {forecastPoints.length > 0 ? (
          <Line
            x1={chartPadding}
            x2={width - priceLabelWidth + 6}
            y1={plotBottom}
            y2={plotBottom}
            stroke={colors.violet}
            strokeWidth={1}
            strokeOpacity={0.28}
          />
        ) : null}

        {candles.map((candle, index) => {
          const fill = candle.close >= candle.open ? colors.green : colors.red;
          const bodyY = Math.min(y(candle.open), y(candle.close));
          const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close)));
          const centerX = x(index);
          return (
            <G key={`${candle.time}-${index}`}>
              <Line x1={centerX} x2={centerX} y1={y(candle.high)} y2={y(candle.low)} stroke={fill} strokeWidth={1.4} />
              <Rect
                x={centerX - candleWidth / 2}
                y={bodyY}
                width={candleWidth}
                height={bodyHeight}
                rx={1.5}
                fill={fill}
              />
            </G>
          );
        })}

        {forecast && (
          <>
            <Path d={upperPath} stroke={colors.violet} strokeWidth={1.4} strokeOpacity={0.38} fill="none" />
            <Path d={lowerPath} stroke={colors.violet} strokeWidth={1.4} strokeOpacity={0.38} fill="none" />
            <Path d={meanPath} stroke={colors.violet} strokeWidth={2.4} fill="none" />
            {forecastPoints.map((point, index) => (
              <Circle key={point.time} cx={forecastX(index)} cy={y(point.mean)} r={2.4} fill={colors.violet} />
            ))}
            <SvgText x={width - 110} y={20} fill={colors.violet} fontSize={10} fontWeight="700">
              AI scenario
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%"
  },
  empty: {
    alignItems: "center",
    justifyContent: "center"
  }
});

function buildDateTicks(candles: Candle[]) {
  const lastIndex = candles.length - 1;
  const indexes = Array.from(new Set([0, Math.floor(lastIndex / 2), lastIndex])).filter((index) => index >= 0);
  return indexes.map((index, tickIndex) => ({
    index,
    label: formatShortDate(candles[index].time),
    anchor: tickIndex === 0 ? "start" : tickIndex === indexes.length - 1 ? "end" : "middle"
  })) as { index: number; label: string; anchor: "start" | "middle" | "end" }[];
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (month && day) return `${month}/${day}`;
  return value.slice(0, 5);
}

function formatChartPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}
