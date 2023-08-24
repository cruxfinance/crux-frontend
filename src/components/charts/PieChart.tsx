import { useState, FC, useEffect } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { Text } from "@visx/text";
import { generateGradient } from "@src/utils/color";
import { currencies, Currencies } from '@src/utils/currencies';
import { IActiveToken } from "../portfolio/TokenSummary";
import { formatNumber } from "@src/utils/general";

export interface IPieToken {
  name: string;
  amount: number;
  value: number;
}

interface IAngledPieToken extends IPieToken {
  startAngle: number;
  endAngle: number;
}

export interface IPieChartProps {
  tokens: IPieToken[];
  currency: Currencies;
  colors: string[];
  totalValue: number;
  activeSymbol: string | null;
  setActiveSymbol: React.Dispatch<React.SetStateAction<string | null>>
}

export const PieChart: FC<IPieChartProps> = ({ tokens, currency, colors, activeSymbol, setActiveSymbol, totalValue }) => {
  const [active, setActive] = useState<IActiveToken>(null);
  const [tokensWithAngles, setTokensWithAngles] = useState<IAngledPieToken[]>([])
  const width = 250;
  const half = width / 2;
  const currencySymbol = currencies[currency]

  let currentAngle = 0;

  useEffect(() => {
    // Calculate start and end angle for each token
    const addAngles = tokens.map(token => {
      const value = token.amount * token.value;
      const startAngle = currentAngle;
      const endAngle = currentAngle + (value / totalValue) * 2 * Math.PI;
      currentAngle = endAngle;
      return { ...token, startAngle, endAngle };
    });
    setTokensWithAngles(addAngles)
  }, [tokens])

  useEffect(() => {
    const activeToken = tokensWithAngles.find(token => token.name === activeSymbol);

    if (activeToken && activeSymbol !== active?.name) {
      setActive({ ...activeToken, color: colors[tokensWithAngles.indexOf(activeToken)] });
    } else if (!activeToken && active) {
      setActive(null);
    }
  }, [activeSymbol, tokensWithAngles, colors, active]);

  return (
    <main>
      <svg width={width} height={width}>
        <Group top={half} left={half}>
          <Pie
            data={tokensWithAngles}
            pieValue={(data) => data.amount * data.value}
            outerRadius={({ data }) => {
              const size = active && active.name == data.name ? 0 : 4;
              return half - size;
            }}
            innerRadius={({ data }) => {
              const size = active && active.name == data.name ? 26 : 20;
              return half - size;
            }}
            padAngle={0.02}
            pieSort={null} // Disable default sorting
          >
            {(pie) => {
              // Sort arcs based on start angle
              const sortedArcs = [...pie.arcs].sort((a, b) => a.startAngle - b.startAngle);

              return sortedArcs.map((arc, i) => {
                if (!arc) return null; // Skip rendering if arc is null
                return (
                  <g
                    key={`${arc.data.name}-${i}`}
                    onMouseEnter={() => {
                      arc.data && setActive({ ...arc.data, color: colors[i] })
                      setActiveSymbol(arc.data.name)
                    }}
                    onMouseLeave={() => {
                      setActive(null)
                      setActiveSymbol(null)
                    }}
                  >
                    <path
                      d={pie.path(arc)!}
                      fill={colors[i]}
                    />
                  </g>
                );
              });
            }}
          </Pie>

          {active ? (
            <>
              <Text textAnchor="middle" fill="#fff" fontSize={40} dy={0}>
                {`${currencySymbol}${Math.floor(active.amount * active.value)}`}
              </Text>
              <Text
                textAnchor="middle"
                fill={active.color}
                fontSize={20}
                dy={30}
              >
                {`${formatNumber(active.amount)} ${active.name}`}
              </Text>
            </>
          ) : (
            <>
              <Text textAnchor="middle" fill="#fff" fontSize={40} dy={10}>
                {`${currencySymbol}${Math.floor(
                  tokens.reduce((acc, coin) => acc + coin.amount * coin.value, 0)
                )}`}
              </Text>

              {/* <Text textAnchor="middle" fill="#aaa" fontSize={20} dy={30}>
                {`${tokens.length} Assets`}
              </Text> */}
            </>
          )}
        </Group>
      </svg>
    </main>
  );
}