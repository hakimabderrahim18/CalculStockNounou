import React from 'react';
import CategoryManager from '../components/categories/CategoryManager';

export default function CategoriesPage({ onShowToast }) {
  return (
    <div>
      <CategoryManager onShowToast={onShowToast} />
    </div>
  );
}
