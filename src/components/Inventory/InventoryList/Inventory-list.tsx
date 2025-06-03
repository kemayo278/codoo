'use client';

import React from 'react';

interface Props {
  productId: string;
  onBack: () => void;
  parentView: 'product' | 'shop';
}

export function InventoryList({ productId, onBack, parentView }: Props): JSX.Element {
  return (
    <div>
      <button onClick={onBack}>Retour</button>
      <h1>Inventaire du produit {productId}</h1>
    </div>
  );
}
