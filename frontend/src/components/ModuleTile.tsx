import { MODULES, type ModuleKey } from "../lib/modules";

const SIZES = {
  sm: { box: "h-9 w-9 rounded-xl", icon: 18 },
  md: { box: "h-11 w-11 rounded-2xl", icon: 21 },
  lg: { box: "h-14 w-14 rounded-[1.25rem]", icon: 26 },
};

type Props = {
  module: ModuleKey;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Mosaico de color que identifica a un módulo. Es decorativo. */
function ModuleTile({ module, size = "md", className = "" }: Props) {
  const { icon: Icon, tile } = MODULES[module];
  const { box, icon } = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center border-[1.5px] shadow-tile ${box} ${tile} ${className}`}
    >
      <Icon size={icon} strokeWidth={2.1} />
    </span>
  );
}

export default ModuleTile;
