import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, isValidElement } from 'react';
import styles from '@patternfly/react-styles/css/components/Form/form.mjs';
import { ASTERISK } from '../../helpers/htmlConstants';
import { css } from '@patternfly/react-styles';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
export const FormGroup = (_a) => {
    var { children = null, className = '', label, labelInfo, labelHelp, isRequired = false, isInline = false, hasNoPaddingTop = false, isStack = false, fieldId, role } = _a, props = __rest(_a, ["children", "className", "label", "labelInfo", "labelHelp", "isRequired", "isInline", "hasNoPaddingTop", "isStack", "fieldId", "role"]);
    const isGroupOrRadioGroup = role === 'group' || role === 'radiogroup';
    const LabelComponent = isGroupOrRadioGroup ? 'span' : 'label';
    const labelContent = (_jsxs(_Fragment, { children: [_jsxs(LabelComponent, Object.assign({ className: css(styles.formLabel) }, (!isGroupOrRadioGroup && { htmlFor: fieldId }), { children: [_jsx("span", { className: css(styles.formLabelText), children: label }), isRequired && (_jsxs("span", { className: css(styles.formLabelRequired), "aria-hidden": "true", children: [' ', ASTERISK] }))] })), _jsx(_Fragment, { children: "\u00A0\u00A0" }), isValidElement(labelHelp) && _jsx("span", { className: styles.formGroupLabelHelp, children: labelHelp })] }));
    return (_jsx(GenerateId, { children: (randomId) => (_jsxs("div", Object.assign({ className: css(styles.formGroup, className) }, (role && { role }), (isGroupOrRadioGroup && { 'aria-labelledby': `${fieldId || randomId}-legend` }), props, { children: [label && (_jsxs("div", Object.assign({ className: css(styles.formGroupLabel, labelInfo && styles.modifiers.info, hasNoPaddingTop && styles.modifiers.noPaddingTop) }, (isGroupOrRadioGroup && { id: `${fieldId || randomId}-legend` }), { children: [labelInfo && (_jsxs(Fragment, { children: [_jsx("div", { className: css(styles.formGroupLabelMain), children: labelContent }), _jsx("div", { className: css(styles.formGroupLabelInfo), children: labelInfo })] })), !labelInfo && labelContent] }))), _jsx("div", { className: css(styles.formGroupControl, isInline && styles.modifiers.inline, isStack && styles.modifiers.stack), children: children })] }))) }));
};
FormGroup.displayName = 'FormGroup';
//# sourceMappingURL=FormGroup.js.map