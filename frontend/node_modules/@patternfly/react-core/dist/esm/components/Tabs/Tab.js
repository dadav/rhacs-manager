import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext, forwardRef, useEffect } from 'react';
import styles from '@patternfly/react-styles/css/components/Tabs/tabs.mjs';
import { TabButton } from './TabButton';
import { TabsContext } from './TabsContext';
import { css } from '@patternfly/react-styles';
import { Tooltip } from '../Tooltip';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import { TabAction } from './TabAction';
const TabBase = (_a) => {
    var { title, eventKey, tabContentRef, id: childId, tabContentId, className: childClassName = '', ouiaId: childOuiaId, isDisabled, isAriaDisabled, inoperableEvents = ['onClick', 'onKeyPress'], href, innerRef, tooltip, closeButtonAriaLabel, isCloseDisabled = false, actions } = _a, props = __rest(_a, ["title", "eventKey", "tabContentRef", "id", "tabContentId", "className", "ouiaId", "isDisabled", "isAriaDisabled", "inoperableEvents", "href", "innerRef", "tooltip", "closeButtonAriaLabel", "isCloseDisabled", "actions"]);
    const preventedEvents = inoperableEvents.reduce((handlers, eventToPrevent) => (Object.assign(Object.assign({}, handlers), { [eventToPrevent]: (event) => {
            event.preventDefault();
        } })), {});
    const { mountOnEnter, localActiveKey, unmountOnExit, uniqueId, setAccentStyles, handleTabClick, handleTabClose } = useContext(TabsContext);
    let ariaControls = tabContentId ? `${tabContentId}` : `pf-tab-section-${eventKey}-${childId || uniqueId}`;
    if ((mountOnEnter || unmountOnExit) && eventKey !== localActiveKey) {
        ariaControls = undefined;
    }
    const isButtonElement = Boolean(!href);
    const getDefaultTabIdx = () => {
        if (isDisabled) {
            return isButtonElement ? null : -1;
        }
        else if (isAriaDisabled) {
            return null;
        }
    };
    const tabButton = (_jsx(TabButton, Object.assign({ parentInnerRef: innerRef, className: css(styles.tabsLink, isDisabled && href && styles.modifiers.disabled, isAriaDisabled && styles.modifiers.ariaDisabled), disabled: isButtonElement ? isDisabled : null, "aria-disabled": isDisabled || isAriaDisabled, tabIndex: getDefaultTabIdx(), onClick: (event) => handleTabClick(event, eventKey, tabContentRef) }, (isAriaDisabled ? preventedEvents : null), { id: `pf-tab-${eventKey}-${childId || uniqueId}`, "aria-controls": ariaControls, tabContentRef: tabContentRef, ouiaId: childOuiaId, href: href, role: "tab", "aria-selected": eventKey === localActiveKey }, props, { children: title })));
    useEffect(() => {
        setAccentStyles(true);
    }, [title, actions]);
    return (_jsxs("li", { className: css(styles.tabsItem, eventKey === localActiveKey && styles.modifiers.current, (handleTabClose || actions) && styles.modifiers.action, (isDisabled || isAriaDisabled) && styles.modifiers.disabled, childClassName), role: "presentation", children: [tooltip ? _jsx(Tooltip, Object.assign({}, tooltip.props, { children: tabButton })) : tabButton, actions && actions, handleTabClose !== undefined && (_jsx(TabAction, { "aria-label": closeButtonAriaLabel || 'Close tab', onClick: (event) => handleTabClose(event, eventKey, tabContentRef), isDisabled: isCloseDisabled, children: _jsx(TimesIcon, {}) }))] }));
};
export const Tab = forwardRef((props, ref) => _jsx(TabBase, Object.assign({ innerRef: ref }, props)));
Tab.displayName = 'Tab';
//# sourceMappingURL=Tab.js.map