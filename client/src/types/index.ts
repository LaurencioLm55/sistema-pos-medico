export interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: {
    id: number;
    name: string;
  };
}