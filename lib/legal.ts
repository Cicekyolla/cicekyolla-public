export const company = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "Çiçek Yolla",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Şirket adresi yayın öncesinde tanımlanmalıdır.",
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "destek@cicekyolla.com.tr",
  phone: process.env.NEXT_PUBLIC_LEGAL_PHONE || "İletişim telefonu yayın öncesinde tanımlanmalıdır.",
  mersis: process.env.NEXT_PUBLIC_MERSIS_NO || "Yayın öncesinde tanımlanmalıdır.",
};
