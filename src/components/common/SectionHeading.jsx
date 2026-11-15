import React from 'react';

/**
 * Reusable SectionHeading component for consistent, high-contrast headings across sections.
 */
export default function SectionHeading({ badge, title, subtitle, align = 'center' }) {
  const alignmentClasses =
    align === 'center' ? 'text-center mx-auto max-w-3xl' : 'text-left max-w-2xl';

  return (
    <div className={`mb-12 md:mb-16 ${alignmentClasses}`}>
      {badge && (
        <span className="inline-block px-4 py-1.5 mb-4 text-base font-bold tracking-wide text-teal-800 uppercase bg-teal-100 border border-teal-200 rounded-full">
          {badge}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg sm:text-xl text-slate-700 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

