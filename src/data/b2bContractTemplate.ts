/**
 * Elektron hamkorlik shartnomasi — statik, versiyalangan matn.
 *
 * Haqiqiy ERI (elektron raqamli imzo) hozircha YO'Q — supplier shu matnni
 * o'qib, "Roziman" tugmasini bosadi (contracts.status='accepted' bo'ladi).
 * Kelajakda haqiqiy ERI ulanganda, shu matn versiyasi saqlanadi
 * (contracts.contract_version) va contracts.signature_ref to'ldiriladi.
 */

export const B2B_CONTRACT_VERSION = 'v1';

export interface ContractClause {
  title: string;
  body: string;
}

export function getB2BContractClauses(commissionRate: number): ContractClause[] {
  return [
    {
      title: "1. Komissiya",
      body: `Onbozar har bir muvaffaqiyatli buyurtmadan ${commissionRate}% komissiya oladi. Stavka buyurtma yaratilgan paytda "suratga olinadi" — keyinchalik stavka o'zgarsa, eski buyurtmalarga ta'sir qilmaydi.`,
    },
    {
      title: "2. To'lov shartlari",
      body: "Xaridor naqd yoki (kelajakda) onlayn to'lov orqali to'laydi. Naqd to'lovni supplier o'zi qabul qiladi va tizimda tasdiqlaydi. Onbozar naqd pulni o'zida saqlamaydi.",
    },
    {
      title: "3. Yetkazib berish javobgarligi",
      body: "Mahsulotni belgilangan manzilga yetkazib berish supplierning o'z zimmasida (yoki kelishilgan yetkazib beruvchi orqali). Onbozar faqat platforma sifatida buyurtmani bog'laydi.",
    },
    {
      title: "4. Qaytarish siyosati",
      body: "Sifatsiz yoki noto'g'ri yetkazilgan mahsulot uchun qaytarish shartlari supplier va xaridor o'rtasida to'g'ridan-to'g'ri kelishiladi. Onbozar bahsli holatlarda vositachilik qilishi mumkin.",
    },
    {
      title: "5. Bekor qilish",
      body: "Xaridor yoki supplier buyurtmani 'pending' holatida bekor qilishi mumkin. Tayyorlanish boshlangandan keyin bekor qilish ikki tomon kelishuvini talab qiladi.",
    },
    {
      title: "6. Mahsulot sifati uchun javobgarlik",
      body: "Supplier platformaga joylashtirilgan mahsulot sifati, tavsifga mosligi va qonuniyligi uchun to'liq javobgar.",
    },
    {
      title: "7. Hisob-kitob",
      body: "Har bir buyurtma bo'yicha komissiya avtomatik hisoblanadi va supplier hisobotida (Moliya bo'limi) ko'rinadi. To'liq hisob-kitob va pul o'tkazish tartibi keyingi bosqichda ishga tushiriladi.",
    },
    {
      title: "8. Shartnomani bekor qilish",
      body: "Ikkala tomon ham shartnomani istalgan vaqtda bekor qilishi mumkin. Bekor qilingandan so'ng supplierning yangi mahsulot joylashtirish huquqi to'xtatiladi, mavjud buyurtmalar yakunlanguncha davom etadi.",
    },
  ];
}
