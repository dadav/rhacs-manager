import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useRef } from 'react';
import { Button } from '../Button';
import { KeyTypes } from '../../helpers/constants';
import HelpIcon from '@patternfly/react-icons/dist/esm/icons/help-icon';
const FormGroupLabelHelpBase = (_a) => {
    var { 'aria-label': ariaLabel, className, innerRef } = _a, props = __rest(_a, ['aria-label', "className", "innerRef"]);
    const ref = useRef(null);
    const buttonRef = innerRef || ref;
    const isMutableRef = (ref) => typeof ref === 'object' && ref !== null && 'current' in ref && ref.current !== undefined;
    const handleKeyDown = (event) => {
        if ([KeyTypes.Space, KeyTypes.Enter].includes(event.key) && isMutableRef(buttonRef) && buttonRef.current) {
            event.preventDefault();
            buttonRef.current.click();
        }
    };
    return (_jsx(Button, Object.assign({ component: "span", isInline: true, ref: buttonRef, onKeyDown: handleKeyDown, "aria-label": ariaLabel, className: className, variant: "plain", hasNoPadding: true }, props, { icon: _jsx(HelpIcon, {}) })));
};
export const FormGroupLabelHelp = forwardRef((props, ref) => (_jsx(FormGroupLabelHelpBase, Object.assign({ innerRef: ref }, props))));
FormGroupLabelHelp.displayName = 'FormGroupLabelHelp';
//# sourceMappingURL=FormGroupLabelHelp.js.map