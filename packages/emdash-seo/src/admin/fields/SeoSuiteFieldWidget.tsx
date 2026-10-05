import * as React from 'react';
import { FocusKeywordFieldWidget, type FocusKeywordFieldWidgetProps } from './FocusKeywordFieldWidget.js';

export function SeoSuiteFieldWidget(props: FocusKeywordFieldWidgetProps) {
  return (
    <FocusKeywordFieldWidget
      {...props}
      label={props.label || 'SEO & Readability Suite'}
      id={props.id || 'field-seo_suite'}
    />
  );
}
