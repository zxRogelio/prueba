import { createContext } from "react";

export interface CartProduct {
  id: number | string;
  name: string;
  price: number;
  image: string;
  category?: string;
}

export interface CartItem extends CartProduct {
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  addItem: (product: CartProduct) => void;
  updateQuantity: (productId: CartItem["id"], quantity: number) => void;
  removeItem: (productId: CartItem["id"]) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const CartContext = createContext<CartContextType | null>(null);
