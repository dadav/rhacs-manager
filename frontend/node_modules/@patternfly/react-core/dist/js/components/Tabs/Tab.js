"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tab = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tabs_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tabs/tabs"));
const TabButton_1 = require("./TabButton");
const TabsContext_1 = require("./TabsContext");
const react_styles_1 = require("@patternfly/react-styles");
const Tooltip_1 = require("../Tooltip");
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const TabAction_1 = require("./TabAction");
const TabBase = (_a) => {
    var { title, eventKey, tabContentRef, id: childId, tabContentId, className: childClassName = '', ouiaId: childOuiaId, isDisabled, isAriaDisabled, inoperableEvents = ['onClick', 'onKeyPress'], href, innerRef, tooltip, closeButtonAriaLabel, isCloseDisabled = false, actions } = _a, props = tslib_1.__rest(_a, ["title", "eventKey", "tabContentRef", "id", "tabContentId", "className", "ouiaId", "isDisabled", "isAriaDisabled", "inoperableEvents", "href", "innerRef", "tooltip", "closeButtonAriaLabel", "isCloseDisabled", "actions"]);
    const preventedEvents = inoperableEvents.reduce((handlers, eventToPrevent) => (Object.assign(Object.assign({}, handlers), { [eventToPrevent]: (event) => {
            event.preventDefault();
        } })), {});
    const { mountOnEnter, localActiveKey, unmountOnExit, uniqueId, setAccentStyles, handleTabClick, handleTabClose } = (0, react_1.useContext)(TabsContext_1.TabsContext);
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
    const tabButton = ((0, jsx_runtime_1.jsx)(TabButton_1.TabButton, Object.assign({ parentInnerRef: innerRef, className: (0, react_styles_1.css)(tabs_1.default.tabsLink, isDisabled && href && tabs_1.default.modifiers.disabled, isAriaDisabled && tabs_1.default.modifiers.ariaDisabled), disabled: isButtonElement ? isDisabled : null, "aria-disabled": isDisabled || isAriaDisabled, tabIndex: getDefaultTabIdx(), onClick: (event) => handleTabClick(event, eventKey, tabContentRef) }, (isAriaDisabled ? preventedEvents : null), { id: `pf-tab-${eventKey}-${childId || uniqueId}`, "aria-controls": ariaControls, tabContentRef: tabContentRef, ouiaId: childOuiaId, href: href, role: "tab", "aria-selected": eventKey === localActiveKey }, props, { children: title })));
    (0, react_1.useEffect)(() => {
        setAccentStyles(true);
    }, [title, actions]);
    return ((0, jsx_runtime_1.jsxs)("li", { className: (0, react_styles_1.css)(tabs_1.default.tabsItem, eventKey === localActiveKey && tabs_1.default.modifiers.current, (handleTabClose || actions) && tabs_1.default.modifiers.action, (isDisabled || isAriaDisabled) && tabs_1.default.modifiers.disabled, childClassName), role: "presentation", children: [tooltip ? (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, Object.assign({}, tooltip.props, { children: tabButton })) : tabButton, actions && actions, handleTabClose !== undefined && ((0, jsx_runtime_1.jsx)(TabAction_1.TabAction, { "aria-label": closeButtonAriaLabel || 'Close tab', onClick: (event) => handleTabClose(event, eventKey, tabContentRef), isDisabled: isCloseDisabled, children: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) }))] }));
};
exports.Tab = (0, react_1.forwardRef)((props, ref) => (0, jsx_runtime_1.jsx)(TabBase, Object.assign({ innerRef: ref }, props)));
exports.Tab.displayName = 'Tab';
//# sourceMappingURL=Tab.js.map