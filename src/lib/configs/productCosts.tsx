interface Discount {
  privilegeLevel: 'PRO' | 'BASIC' | 'STANDARD';
  percentOff: number;
}

interface AdditionalDiscount {
  method: string; // e.g., "crux"
  percentOff: number;
}

interface ProductCost {
  product: string;
  basePrice: number;
  discounts: Discount[];
  additionalDiscounts?: AdditionalDiscount[];
}

export const productCosts: ProductCost[] = [
  {
    product: 'report',
    basePrice: 40,
    discounts: [
      { privilegeLevel: 'PRO', percentOff: 10 },
      { privilegeLevel: 'BASIC', percentOff: 10 },
      { privilegeLevel: 'STANDARD', percentOff: 0 },
    ],
    additionalDiscounts: [
      { method: 'crux', percentOff: 30 }, // Additional 30% off if paid in crux
    ],
  },
  // Other products as needed
];

export const getPriceForProduct = (
  productName: string,
  privilegeLevel: 'PRO' | 'BASIC' | 'DEFAULT',
  paymentMethod: string = '' // Optional parameter for payment method, e.g., "crux"
) => {
  const product = productCosts.find(p => p.product === productName);
  if (!product) throw new Error("Product not found");

  const discount = product.discounts.find(d => d.privilegeLevel === privilegeLevel) || { percentOff: 0 };
  let discountedPrice = product.basePrice - (product.basePrice * discount.percentOff / 100);

  // Apply additional discount if a relevant payment method is specified
  if (paymentMethod && product.additionalDiscounts) {
    const additionalDiscount = product.additionalDiscounts.find(d => d.method === paymentMethod);
    if (additionalDiscount) {
      // Apply the additional discount on top of the already discounted price
      discountedPrice -= discountedPrice * additionalDiscount.percentOff / 100;
    }
  }

  return {
    basePrice: product.basePrice,
    discountedPrice: discountedPrice, // Rounding to 2 decimal places for currency
    percentOff: discount.percentOff,
    additionalPercentOff: paymentMethod && product.additionalDiscounts ? (product.additionalDiscounts.find(d => d.method === paymentMethod)?.percentOff || 0) : 0
  };
};