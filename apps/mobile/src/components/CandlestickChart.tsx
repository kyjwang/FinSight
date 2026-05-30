import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { Candle, Forecast } from "@/types";
import { colors } from "@/lib/theme";

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
  const chartPadding = 18;
  const forecastPoints = forecast?.points ?? [];
  const values = [
    ...candles.flatMap((candle) => [candle.high, candle.low]),
    ...forecastPoints.flatMap((point) => [point.upper, point.lower])
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const totalPoints = candles.length + forecastPoints.length;
  const candleWidth = Math.max(3, (width - chartPadding * 2) / totalPoints - 3);
  const candleStep = (width - chartPadding * 2) / Math.max(1, totalPoints - 1);

  const y = (value: number) => chartPadding + ((max - value) / range) * (height - chartPadding * 2);
  const x = (index: number) => chartPadding + index * candleStep;
  const forecastX = (index: number) => x(candles.length + index);

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
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            x1={chartPadding}
            x2={width - chartPadding}
            y1={height * ratio}
            y2={height * ratio}
            stroke={colors.border}
            strokeDasharray="4 6"
            strokeWidth={1}
          />
        ))}

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
            <SvgText x={width - 78} y={20} fill={colors.violet} fontSize={10} fontWeight="700">
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
