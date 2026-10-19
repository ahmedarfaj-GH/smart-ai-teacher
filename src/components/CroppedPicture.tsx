// جزء من صفحة الكتاب (صورة العنصر)، يُقصّ بالنِّسب من صورة الصفحة الكاملة. كل الصفحات بنفس مقاس 1328×1593.
const PAGE_ASPECT = 1328 / 1593

export function CroppedPicture({ url, crop }: { url: string; crop: [number, number, number, number] }) {
  const [x, y, w, h] = crop
  return (
    <div
      role="img"
      className="w-40 rounded-lg border border-gray-200"
      style={{
        aspectRatio: `${w * PAGE_ASPECT} / ${h}`,
        backgroundImage: `url(${url})`,
        backgroundSize: `${100 / w}% ${100 / h}%`,
        backgroundPosition: `${(x / (1 - w)) * 100}% ${(y / (1 - h)) * 100}%`,
      }}
    />
  )
}
