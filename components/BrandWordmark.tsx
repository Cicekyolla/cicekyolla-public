export function BrandWordmark({
  tagline,
  size = "header",
  inverse = false,
}: {
  tagline?: string;
  size?: "header" | "compact" | "footer";
  inverse?: boolean;
}) {
  const wordmarkSize =
    size === "footer"
      ? "text-[42px] xl:text-[46px]"
      : size === "compact"
        ? "text-[32px]"
        : "text-[36px] xl:text-[40px]";
  const flowerSize =
    size === "footer"
      ? "h-8 w-7 xl:h-9 xl:w-8"
      : size === "compact"
        ? "h-6 w-5"
        : "h-7 w-6 xl:h-8 xl:w-7";
  const taglineSize =
    size === "footer"
      ? "mt-2 text-[9px] xl:text-[10px]"
      : size === "compact"
        ? "mt-1 text-[8px]"
        : "mt-1.5 text-[8.5px] xl:text-[9px]";
  const wordmarkColor = inverse ? "text-white" : "text-[#51247A]";
  const taglineColor = inverse ? "text-[#C084FC]" : "text-[#51247A]";

  return (
    <div className="flex w-fit flex-col" aria-label="ÇiçekYolla">
      <div className="flex items-start">
        <span
          style={{ fontFamily: "var(--font-display)" }}
          className={`${wordmarkSize} ${wordmarkColor} whitespace-nowrap font-semibold leading-[0.82] tracking-[-0.045em]`}
        >
          ÇiçekYolla
        </span>
        <svg
          viewBox="0 0 28 32"
          aria-hidden="true"
          className={`${flowerSize} -ml-0.5 -mt-2 flex-shrink-0`}
        >
          <path d="M13.8 30C13.2 22.4 14.7 15.3 19.2 9" fill="none" stroke={inverse ? "#7CCB5A" : "#5B9E3B"} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M14.5 21.5C10.2 18.5 7.2 18.7 4.7 20.1c2.4 3.7 5.6 4.5 9.7 2.8" fill={inverse ? "#73B84D" : "#6BAA45"} />
          <path d="M18.8 10.7C13.5 7.6 13.3 3.8 14.8 1.1c4.9 1.5 6.4 4.9 4 9.6Z" fill={inverse ? "#C084FC" : "#5B2A86"} />
          <path d="M19.6 10.4C21.3 5.3 24.5 3.8 27 4.1c.2 4.8-2 7.4-7.4 6.3Z" fill={inverse ? "#A855F7" : "#7440A0"} />
        </svg>
      </div>
      <span className={`${taglineSize} ${taglineColor} pl-0.5 font-bold uppercase leading-none tracking-[0.32em]`}>
        {tagline || "Premium Çiçekçi"}
      </span>
    </div>
  );
}
