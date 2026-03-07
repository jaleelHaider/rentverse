import React from 'react'
import { Link } from 'react-router-dom'

interface CategoryCardProps {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
  count: number
  subCategories: string[]
  popular?: boolean
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  id,
  name,
  icon,
  color,
  bgColor,
  count,
  subCategories,
  popular
}) => {
  return (
    <Link
      to={`/browse?category=${id}`}
      className="card p-6 hover:shadow-lg transition-shadow group"
    >
      <div className={`w-16 h-16 rounded-xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <div className={`bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {icon}
        </div>
      </div>
      
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg group-hover:text-primary-600">
          {name}
        </h3>
        {popular && (
          <span className="text-xs font-medium bg-primary-100 text-primary-700 px-2 py-1 rounded">
            Popular
          </span>
        )}
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        {count.toLocaleString()} items available
      </p>
      
      <div className="flex flex-wrap gap-2">
        {subCategories.slice(0, 3).map((sub, index) => (
          <span
            key={index}
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
          >
            {sub}
          </span>
        ))}
        {subCategories.length > 3 && (
          <span className="text-xs text-gray-500">
            +{subCategories.length - 3} more
          </span>
        )}
      </div>
    </Link>
  )
}

export default CategoryCard