import type { AvatarVariant } from "@/lib/landing-data";
import { cn } from "@/components/ui";

type HairStyle = "long" | "short" | "bob" | "curly" | "bun";

interface Look {
  background: string;
  shape: string;
  skin: string;
  hair: string;
  top: string;
  collar: string;
  blush: string;
  hairStyle: HairStyle;
  glasses?: boolean;
  earring?: boolean;
}

const LOOKS: Record<AvatarVariant, Look> = {
  xiaoman: {
    background: "#FDEAE6",
    shape: "#F7C9C0",
    skin: "#EFC5AD",
    hair: "#2D2730",
    top: "#F28C8C",
    collar: "#FFF8F3",
    blush: "#E67A7A",
    hairStyle: "long",
    earring: true,
  },
  yuchen: {
    background: "#E9EDFF",
    shape: "#C9D0FF",
    skin: "#D8A37B",
    hair: "#252129",
    top: "#5B6CFF",
    collar: "#EEF0FF",
    blush: "#C27A6C",
    hairStyle: "short",
    glasses: true,
  },
  suning: {
    background: "#E8F6EE",
    shape: "#BDE8D3",
    skin: "#F1D0BA",
    hair: "#4B332B",
    top: "#7BC9A6",
    collar: "#F7FFFB",
    blush: "#E39385",
    hairStyle: "curly",
  },
  zhouzhou: {
    background: "#FCEDE6",
    shape: "#F6C7B7",
    skin: "#C98F6A",
    hair: "#2D2824",
    top: "#1F2937",
    collar: "#F28C8C",
    blush: "#A9634D",
    hairStyle: "short",
    earring: true,
  },
  hemiao: {
    background: "#EAF7F0",
    shape: "#C6EAD9",
    skin: "#EAC1A7",
    hair: "#2F2630",
    top: "#FFFDF9",
    collar: "#7BC9A6",
    blush: "#DF8B80",
    hairStyle: "bob",
  },
  tangke: {
    background: "#EEF0FF",
    shape: "#CBD2FF",
    skin: "#E5B492",
    hair: "#352822",
    top: "#5B6CFF",
    collar: "#FFFDF9",
    blush: "#C47B68",
    hairStyle: "bun",
    glasses: true,
    earring: true,
  },
};

function BackHair({ style, color }: { style: HairStyle; color: string }) {
  if (style === "long") {
    return (
      <>
        <path d="M24 66c0-29 14-47 36-47s36 18 36 47v34H24z" fill={color} />
        <path d="M27 74c-2 15-1 29 2 40h10c-4-13-4-28-2-42z" fill={color} />
        <path d="M93 74c2 15 1 29-2 40H81c4-13 4-28 2-42z" fill={color} />
      </>
    );
  }

  if (style === "bob") {
    return (
      <>
        <path d="M27 64c0-27 14-43 33-43s33 16 33 43v10c0 8-5 13-13 13H40c-8 0-13-5-13-13z" fill={color} />
        <circle cx="30" cy="65" r="9" fill={color} />
        <circle cx="90" cy="65" r="9" fill={color} />
      </>
    );
  }

  if (style === "curly") {
    return (
      <g fill={color}>
        <circle cx="34" cy="44" r="14" />
        <circle cx="48" cy="30" r="15" />
        <circle cx="66" cy="27" r="16" />
        <circle cx="83" cy="37" r="14" />
        <circle cx="90" cy="55" r="13" />
        <circle cx="32" cy="61" r="12" />
        <circle cx="31" cy="78" r="9" />
        <circle cx="89" cy="78" r="9" />
      </g>
    );
  }

  if (style === "bun") {
    return (
      <>
        <circle cx="61" cy="18" r="13" fill={color} />
        <circle cx="61" cy="18" r="7" fill="#F7F1E8" opacity="0.35" />
        <path d="M30 64c0-27 13-42 31-42s31 15 31 42v12H30z" fill={color} />
      </>
    );
  }

  return <path d="M31 64c0-26 12-41 30-41s30 15 30 41v9H31z" fill={color} />;
}

function FrontHair({ style, color }: { style: HairStyle; color: string }) {
  if (style === "curly") {
    return (
      <g fill={color}>
        <path d="M37 50c1-17 10-27 24-27 13 0 22 9 23 25-8-1-14-6-18-13-5 8-15 14-29 15z" />
        <circle cx="39" cy="44" r="8" />
        <circle cx="78" cy="43" r="8" />
      </g>
    );
  }

  if (style === "short") {
    return (
      <g fill={color}>
        <path d="M37 49c2-16 10-25 23-25 15 0 23 10 24 28-7-3-12-8-16-15-5 8-16 13-31 12z" />
        <path d="M36 47c-2 8-2 16 0 23l6-2c-2-7-2-15 0-22z" />
        <path d="M84 47c2 8 2 16 0 23l-6-2c2-7 2-15 0-22z" />
      </g>
    );
  }

  if (style === "bob") {
    return (
      <g fill={color}>
        <path d="M36 50c2-18 11-28 25-28 15 0 24 11 25 29-9-2-16-8-20-16-6 9-17 14-30 15z" />
        <path d="M35 47c-3 11-3 22 0 31l7-2c-2-9-2-18-1-27z" />
        <path d="M85 47c3 11 3 22 0 31l-7-2c2-9 2-18 1-27z" />
      </g>
    );
  }

  return (
    <g fill={color}>
      <path d="M36 50c1-18 10-28 24-28 15 0 24 10 25 29-9-2-16-8-20-16-6 9-17 14-29 15z" />
      <path d="M36 47c-2 10-2 21 1 31l6-2c-2-9-2-18-1-27z" />
      <path d="M84 47c2 10 2 21-1 31l-6-2c2-9 2-18 1-27z" />
    </g>
  );
}

export function AvatarArt({
  variant,
  className,
}: {
  variant: AvatarVariant;
  className?: string;
}) {
  const look = LOOKS[variant];

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="120" height="120" fill={look.background} />
      <circle cx="98" cy="19" r="25" fill={look.shape} />
      <path d="M-6 111c19-13 37-16 54-13 22 4 41 3 66-7v29H-6z" fill={look.shape} opacity="0.55" />

      <BackHair style={look.hairStyle} color={look.hair} />

      <path d="M14 120c2-24 20-38 46-38s44 14 46 38z" fill={look.top} />
      <path d="M51 80h18v17c0 5-18 5-18 0z" fill={look.skin} />
      <path d="M28 120c2-16 13-27 32-27s30 11 32 27z" fill={look.top} />
      <path d="M50 94l10 11 10-11" fill="none" stroke={look.collar} strokeWidth="2.5" strokeLinecap="round" />

      <ellipse cx="60" cy="56" rx="22" ry="26" fill={look.skin} />
      <circle cx="38" cy="59" r="4.5" fill={look.skin} />
      <circle cx="82" cy="59" r="4.5" fill={look.skin} />

      <FrontHair style={look.hairStyle} color={look.hair} />

      <circle cx="45" cy="66" r="4.5" fill={look.blush} opacity="0.4" />
      <circle cx="75" cy="66" r="4.5" fill={look.blush} opacity="0.4" />

      <path d="M48 57c2 1.4 4 1.4 6 0" fill="none" stroke="#3A3030" strokeWidth="2" strokeLinecap="round" />
      <path d="M66 57c2 1.4 4 1.4 6 0" fill="none" stroke="#3A3030" strokeWidth="2" strokeLinecap="round" />
      <path d="M47 50c2-1 4-1 6 0" fill="none" stroke={look.hair} strokeWidth="2" strokeLinecap="round" />
      <path d="M67 50c2-1 4-1 6 0" fill="none" stroke={look.hair} strokeWidth="2" strokeLinecap="round" />
      <path d="M59 60c-1 2-1 3 1 3" fill="none" stroke="#A96F5E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M55 68c3 2.8 7 2.8 10 0" fill="none" stroke="#8E4A46" strokeWidth="2" strokeLinecap="round" />

      {look.glasses ? (
        <g fill="none" stroke="#35405A" strokeWidth="1.7">
          <rect x="43" y="51" width="14" height="11" rx="5" />
          <rect x="63" y="51" width="14" height="11" rx="5" />
          <path d="M57 56h6" />
          <path d="M43 55l-5-1" />
          <path d="M77 55l5-1" />
        </g>
      ) : null}

      {look.earring ? (
        <g fill="#F28C8C">
          <circle cx="37.5" cy="66" r="2.2" />
          <circle cx="82.5" cy="66" r="2.2" />
        </g>
      ) : null}

      <circle cx="96" cy="101" r="10" fill={look.collar} opacity="0.35" />
    </svg>
  );
}
