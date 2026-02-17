import type { ReactNode } from "react";

declare module "@visx/shape/lib/shapes/Pie" {
  export interface PieProps<Datum> {
    children?: (provided: any) => ReactNode;
  }
}
