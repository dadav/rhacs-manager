import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { createRef } from 'react';
import styles from '@patternfly/react-styles/css/components/DescriptionList/description-list.mjs';
import { css } from '@patternfly/react-styles';
export const DescriptionListTermHelpTextButton = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    const helpTextRef = createRef();
    const handleKeys = (event) => {
        if (!helpTextRef.current || helpTextRef.current !== event.target) {
            return;
        }
        const key = event.key;
        if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            helpTextRef.current.click();
        }
    };
    return (_jsx("span", Object.assign({ ref: helpTextRef, className: css(className, styles.descriptionListText, styles.modifiers.helpText), role: "button", type: "button", tabIndex: 0, onKeyDown: (event) => handleKeys(event) }, props, { children: children })));
};
DescriptionListTermHelpTextButton.displayName = 'DescriptionListTermHelpTextButton';
//# sourceMappingURL=DescriptionListTermHelpTextButton.js.map