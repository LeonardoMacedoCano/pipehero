import "styled-components";
import type { AppTheme } from "lcano-react-ui";

declare module "styled-components" {
  export interface DefaultTheme extends AppTheme {}
}
