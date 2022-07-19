/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {classNames, useStyleProps} from '@react-spectrum/utils';
import {Flex} from '@react-spectrum/layout';
import {HelpText} from './HelpText';
// @ts-ignore
import intlMessages from '../intl/*.json';
import {Label} from './Label';
import {LabelPosition} from '@react-types/shared';
import labelStyles from '@adobe/spectrum-css-temp/components/fieldlabel/vars.css';
import {mergeProps, mergeRefs} from '@react-aria/utils';
import React, {RefObject, useRef} from 'react';
import {ReadOnlyField} from './ReadOnlyField';
import {SpectrumFieldProps} from '@react-types/label';
import {useFormProps} from '@react-spectrum/form';
import {useMessageFormatter} from '@react-aria/i18n';
// import {useTextField} from '@react-aria/textfield';

function Field(props: SpectrumFieldProps, ref: RefObject<HTMLElement>) {
  props = useFormProps(props);
  let {
    label,
    labelPosition = 'top' as LabelPosition,
    labelAlign,
    isRequired,
    necessityIndicator,
    includeNecessityIndicatorInAccessibilityName,
    validationState,
    description,
    errorMessage,
    isDisabled,
    showErrorIcon,
    children,
    labelProps,
    readOnlyText,
    isReadOnly,
    inputProps, 
    inputRef, 
    // Not every component that uses <Field> supports help text.
    descriptionProps = {},
    errorMessageProps = {},
    elementType,
    wrapperClassName,

    ...otherProps
  } = props;
  let {styleProps} = useStyleProps(otherProps);
  let hasHelpText = !!description || errorMessage && validationState === 'invalid';
  let formatMessage = useMessageFormatter(intlMessages);
  let displayReadOnly = isReadOnly && (readOnlyText || readOnlyText === '');
  let defaultInputRef = useRef<HTMLTextAreaElement>(null);
  inputRef = inputRef || defaultInputRef;

  if (label || hasHelpText) {
    let labelWrapperClass = classNames(
      labelStyles,
      'spectrum-Field',
      {
        'spectrum-Field--positionTop': labelPosition === 'top',
        'spectrum-Field--positionSide': labelPosition === 'side'
      },
      styleProps.className,
      wrapperClassName
    );

    children = React.cloneElement(children, mergeProps(children.props, {
      className: classNames(
        labelStyles,
        'spectrum-Field-field'
      )
    }));

    let renderHelpText = () => (
      <HelpText
        descriptionProps={descriptionProps}
        errorMessageProps={errorMessageProps}
        description={description}
        errorMessage={errorMessage}
        validationState={validationState}
        isDisabled={isDisabled}
        showErrorIcon={showErrorIcon} />
    );

    if (displayReadOnly) {
      if (readOnlyText === '') {
        readOnlyText = formatMessage('(None)');
      }
      children = (
        <ReadOnlyField
          {...props} 
          readOnlyText={readOnlyText}
          inputProps={inputProps} 
          ref={inputRef as RefObject<HTMLTextAreaElement>} />            
      );
    }

    let renderChildren = () => (
      <Flex direction="column" UNSAFE_className={classNames(labelStyles, 'spectrum-Field-wrapper')}>
        {children}
        {hasHelpText && !displayReadOnly && renderHelpText()}
      </Flex>
    );

    return (
      <div
        {...styleProps}
        ref={ref as RefObject<HTMLDivElement>}
        className={labelWrapperClass}>
        {label && (
          <Label
            {...labelProps}
            labelPosition={labelPosition}
            labelAlign={labelAlign}
            isRequired={isRequired}
            necessityIndicator={necessityIndicator}
            includeNecessityIndicatorInAccessibilityName={includeNecessityIndicatorInAccessibilityName}
            elementType={elementType}>
            {label}
          </Label>
        )}
        {renderChildren()}
      </div>
    );
  }

  return React.cloneElement(children, mergeProps(children.props, {
    ...styleProps,
    // @ts-ignore
    ref: mergeRefs(children.ref, ref)
  }));
}

let _Field = React.forwardRef(Field);
export {_Field as Field};
