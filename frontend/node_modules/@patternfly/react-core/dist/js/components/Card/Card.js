"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = exports.CardContext = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const card_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Card/card"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
exports.CardContext = (0, react_1.createContext)({
    cardId: '',
    isExpanded: false,
    isClickable: false,
    isSelectable: false,
    isSelected: false,
    isClicked: false,
    isDisabled: false
});
const CardBase = (_a) => {
    var { children, id = '', className, component = 'div', isCompact = false, isSelectable = false, isClickable = false, isDisabled = false, isSelected = false, isClicked = false, isExpanded = false, isLarge = false, isFullHeight = false, isPlain = false, variant = 'default', ouiaId, ouiaSafe = true, innerRef } = _a, props = tslib_1.__rest(_a, ["children", "id", "className", "component", "isCompact", "isSelectable", "isClickable", "isDisabled", "isSelected", "isClicked", "isExpanded", "isLarge", "isFullHeight", "isPlain", "variant", "ouiaId", "ouiaSafe", "innerRef"]);
    const Component = component;
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.Card.displayName, ouiaId, ouiaSafe);
    if (isCompact && isLarge) {
        // eslint-disable-next-line no-console
        console.warn('Card: Cannot use isCompact with isLarge. Defaulting to isCompact');
        isLarge = false;
    }
    const getSelectableModifiers = () => {
        if (isSelectable && isClickable) {
            return (0, react_styles_1.css)(card_1.default.modifiers.selectable, card_1.default.modifiers.clickable, (isSelected || isClicked) && card_1.default.modifiers.current);
        }
        if (isSelectable) {
            return (0, react_styles_1.css)(card_1.default.modifiers.selectable, isSelected && card_1.default.modifiers.selected);
        }
        if (isClickable) {
            return (0, react_styles_1.css)(card_1.default.modifiers.clickable, isClicked && card_1.default.modifiers.current);
        }
        return '';
    };
    return ((0, jsx_runtime_1.jsx)(exports.CardContext.Provider, { value: {
            cardId: id,
            isExpanded,
            isClickable,
            isSelectable,
            isSelected,
            isClicked,
            isDisabled
        }, children: (0, jsx_runtime_1.jsx)(Component, Object.assign({ ref: innerRef, id: id, className: (0, react_styles_1.css)(card_1.default.card, isCompact && card_1.default.modifiers.compact, isExpanded && card_1.default.modifiers.expanded, isLarge && card_1.default.modifiers.displayLg, isFullHeight && card_1.default.modifiers.fullHeight, isPlain && card_1.default.modifiers.plain, variant === 'secondary' && card_1.default.modifiers.secondary, getSelectableModifiers(), isDisabled && card_1.default.modifiers.disabled, className) }, props, ouiaProps, { children: children })) }));
};
exports.Card = (0, react_1.forwardRef)((props, ref) => (0, jsx_runtime_1.jsx)(CardBase, Object.assign({}, props, { innerRef: ref })));
exports.Card.displayName = 'Card';
//# sourceMappingURL=Card.js.map