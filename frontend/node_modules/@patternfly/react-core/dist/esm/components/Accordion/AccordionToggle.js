import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Accordion/accordion.mjs';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { AccordionContext, AccordionItemContext } from './AccordionContext';
export const AccordionToggle = (_a) => {
    var { className = '', id, children = null, component } = _a, props = __rest(_a, ["className", "id", "children", "component"]);
    const renderToggleIcon = () => (_jsx("span", { className: css(styles.accordionToggleIcon), children: _jsx(AngleRightIcon, {}) }));
    const { isExpanded } = useContext(AccordionItemContext);
    return (_jsx(AccordionContext.Consumer, { children: ({ ToggleContainer, togglePosition }) => {
            const Container = component || ToggleContainer;
            const isToggleStartPositioned = togglePosition === 'start';
            return (_jsx(Container, { children: _jsxs("button", Object.assign({ id: id, className: css(styles.accordionToggle, isExpanded && styles.modifiers.expanded, className), "aria-expanded": isExpanded, type: "button" }, props, { children: [isToggleStartPositioned && renderToggleIcon(), _jsx("span", { className: css(styles.accordionToggleText), children: children }), !isToggleStartPositioned && renderToggleIcon()] })) }));
        } }));
};
AccordionToggle.displayName = 'AccordionToggle';
//# sourceMappingURL=AccordionToggle.js.map