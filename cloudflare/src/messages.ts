export const DISCOUNT_OPTIONS = Array.from({ length: 21 }, (_, i) => 100 + i * 10)

export function discountMessage(c: { code: string; expiry_date: string; discount: number }): string {
  return [
    '提供您老客戶折扣碼可分享給計畫租借的朋友或下次使用',
    `折價券兌換碼：${c.code}`,
    `使用期限${c.expiry_date}，一筆訂單可使用一組，滿額最高可抵用${c.discount}元租金`,
    '詳細辦法請參考 https://zuzoo.tw/discount#coupon_code',
  ].join('\n')
}

export function reviewMessage(): string {
  return '如覺得服務不錯，歡迎在Google給好評價，謝謝您：https://g.page/zuzoo/review?gm'
}
