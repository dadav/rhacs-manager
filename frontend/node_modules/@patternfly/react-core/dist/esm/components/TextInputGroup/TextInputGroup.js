import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useRef } from 'react';
import styles from '@patternfly/react-styles/css/components/TextInputGroup/text-input-group.mjs';
import { css } from '@patternfly/react-styles';
export const TextInputGroupContext = createContext({
    isDisabled: false
});
export const TextInputGroup = (_a) => {
    var { children, className, isDisabled, isPlain, validated, innerRef } = _a, props = __rest(_a, ["children", "className", "isDisabled", "isPlain", "validated", "innerRef"]);
    const ref = useRef(null);
    const textInputGroupRef = innerRef || ref;
    return (_jsx(TextInputGroupContext.Provider, { value: { isDisabled, validated }, children: _jsx("div", Object.assign({ ref: textInputGroupRef, className: css(styles.textInputGroup, isDisabled && styles.modifiers.disabled, isPlain && styles.modifiers.plain, validated && styles.modifiers[validated], className) }, props, { children: children })) }));
};
TextInputGroup.displayName = 'TextInputGroup';
//# sourceMappingURL=TextInputGroup.js.map