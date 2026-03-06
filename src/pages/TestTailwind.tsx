// src/pages/TestTailwind.tsx
export default function TestTailwind() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-red-600 bg-blue-100 p-4 rounded-lg">
        Tailwind Test - This should be red text with blue background
      </h1>
      <div className="mt-4 p-4 bg-green-100 text-green-800">
        If you see green background and green text, Tailwind is working!
      </div>
      <div className="mt-4 flex gap-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Blue Button
        </button>
        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Red Button
        </button>
      </div>
    </div>
  );
}