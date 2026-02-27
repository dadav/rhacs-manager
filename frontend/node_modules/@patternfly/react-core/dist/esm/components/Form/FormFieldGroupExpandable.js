import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { InternalFormFieldGroup } from './InternalFormFieldGroup';
import { useHasAnimations } from '../../helpers';
export const FormFieldGroupExpandable = (_a) => {
    var { children, className, header, isExpanded = false, toggleAriaLabel, hasAnimations: hasAnimationsProp } = _a, props = __rest(_a, ["children", "className", "header", "isExpanded", "toggleAriaLabel", "hasAnimations"]);
    const [localIsExpanded, setIsExpanded] = useState(isExpanded);
    const hasAnimations = useHasAnimations(hasAnimationsProp);
    return (_jsx(InternalFormFieldGroup, Object.assign({ className: className, header: header, isExpandable: true, isExpanded: localIsExpanded, toggleAriaLabel: toggleAriaLabel, onToggle: () => setIsExpanded(!localIsExpanded), hasAnimations: hasAnimations }, props, { children: children })));
};
FormFieldGroupExpandable.displayName = 'FormFieldGroupExpandable';
//# sourceMappingURL=FormFieldGroupExpandable.js.map