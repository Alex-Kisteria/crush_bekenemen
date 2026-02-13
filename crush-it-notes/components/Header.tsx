import Image from "next/image";

export default function Header() {
  return (
    <div className="absolute top-2 left-2 z-50">
      <Image
        src="/valentines-wall-2.svg"
        alt="Valentine's Wall"
        width={300}
        height={60}
        priority
      />
    </div>
  );
}
