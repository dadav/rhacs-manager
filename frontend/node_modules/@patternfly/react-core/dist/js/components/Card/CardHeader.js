"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const card_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Card/card"));
const Card_1 = require("./Card");
const CardHeaderMain_1 = require("./CardHeaderMain");
const CardActions_1 = require("./CardActions");
const CardSelectableActions_1 = require("./CardSelectableActions");
const Button_1 = require("../Button");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const Radio_1 = require("../Radio");
const Checkbox_1 = require("../Checkbox");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const CardHeader = (_a) => {
    var { children, className, actions, selectableActions, id, onExpand, toggleButtonProps, isToggleRightAligned, hasWrap } = _a, props = tslib_1.__rest(_a, ["children", "className", "actions", "selectableActions", "id", "onExpand", "toggleButtonProps", "isToggleRightAligned", "hasWrap"]);
    return ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { children: (randomId) => ((0, jsx_runtime_1.jsx)(Card_1.CardContext.Consumer, { children: ({ cardId, isClickable, isSelectable, isSelected, isDisabled: isCardDisabled }) => {
                const cardHeaderToggle = ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(card_1.default.cardHeaderToggle), children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: "plain", type: "button", onClick: (evt) => {
                            onExpand(evt, cardId);
                        } }, toggleButtonProps, { icon: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(card_1.default.cardHeaderToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })) }));
                const isClickableOrSelectableOnly = (isClickable && !isSelectable) || (isSelectable && !isClickable);
                if ((actions === null || actions === void 0 ? void 0 : actions.actions) && isClickableOrSelectableOnly) {
                    // eslint-disable-next-line no-console
                    console.error(`Card: ${isClickable ? 'Clickable' : 'Selectable'} only cards should not contain any other actions. If you wish to include additional actions, use a clickable and selectable card.`);
                }
                const isClickableOnlyCard = isClickable && !isSelectable;
                if ((isClickableOnlyCard || isSelectable) &&
                    !(selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.selectableActionAriaLabel) &&
                    !(selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.selectableActionAriaLabelledby)) {
                    // eslint-disable-next-line no-console
                    console.error(`Card: ${isClickableOnlyCard ? 'Clickable-only cards' : 'Cards with a selectable input'} must have either the selectableActions.selectableActionAriaLabel or selectableActions.selectableActionAriaLabelledby prop passed in order to provide an accessible name to the clickable element.`);
                }
                const SelectableCardInput = (selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.variant) === 'single' ? Radio_1.Radio : Checkbox_1.Checkbox;
                const getSelectableProps = () => {
                    var _a, _b;
                    return (Object.assign({ className: (0, react_styles_1.css)('pf-m-standalone'), inputClassName: (0, react_styles_1.css)((selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.isHidden) && 'pf-v6-screen-reader'), label: (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {}), 'aria-label': selectableActions.selectableActionAriaLabel, 'aria-labelledby': selectableActions.selectableActionAriaLabelledby, id: (_a = selectableActions.selectableActionId) !== null && _a !== void 0 ? _a : `card-selectable-${randomId}`, name: selectableActions.name, isDisabled: isCardDisabled, onChange: selectableActions.onChange, isChecked: (_b = selectableActions.isChecked) !== null && _b !== void 0 ? _b : isSelected }, selectableActions.selectableActionProps));
                };
                const isClickableLinkCard = (selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.to) !== undefined;
                const ClickableCardComponent = isClickableLinkCard ? 'a' : 'button';
                const getClickableProps = () => {
                    const isDisabledLinkCard = isCardDisabled && isClickableLinkCard;
                    const baseProps = Object.assign({ className: (0, react_styles_1.css)('pf-v6-c-card__clickable-action', isDisabledLinkCard && card_1.default.modifiers.disabled, (selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.isHidden) && 'pf-v6-screen-reader'), id: selectableActions.selectableActionId, 'aria-label': selectableActions.selectableActionAriaLabel, 'aria-labelledby': selectableActions.selectableActionAriaLabelledby }, selectableActions.selectableActionProps);
                    if (isClickableLinkCard) {
                        return Object.assign(Object.assign(Object.assign(Object.assign({}, baseProps), { href: selectableActions.to }), (isCardDisabled && { tabIndex: -1, 'aria-disabled': true })), (selectableActions.isExternalLink && { target: '_blank' }));
                    }
                    return Object.assign(Object.assign({}, baseProps), { type: 'button', disabled: isCardDisabled, onClick: selectableActions.onClickAction });
                };
                return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(card_1.default.cardHeader, isToggleRightAligned && card_1.default.modifiers.toggleRight, hasWrap && card_1.default.modifiers.wrap, className), id: id }, props, { children: [onExpand && !isToggleRightAligned && cardHeaderToggle, (actions || (selectableActions && (isClickable || isSelectable))) && ((0, jsx_runtime_1.jsxs)(CardActions_1.CardActions, { className: actions === null || actions === void 0 ? void 0 : actions.className, hasNoOffset: (actions === null || actions === void 0 ? void 0 : actions.hasNoOffset) || (selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.hasNoOffset), children: [actions === null || actions === void 0 ? void 0 : actions.actions, selectableActions && (isClickable || isSelectable) && ((0, jsx_runtime_1.jsxs)(CardSelectableActions_1.CardSelectableActions, { className: selectableActions === null || selectableActions === void 0 ? void 0 : selectableActions.className, children: [isSelectable && (0, jsx_runtime_1.jsx)(SelectableCardInput, Object.assign({}, getSelectableProps())), isClickableOnlyCard && (0, jsx_runtime_1.jsx)(ClickableCardComponent, Object.assign({}, getClickableProps()))] }))] })), children && (0, jsx_runtime_1.jsx)(CardHeaderMain_1.CardHeaderMain, { children: children }), onExpand && isToggleRightAligned && cardHeaderToggle] })));
            } })) }));
};
exports.CardHeader = CardHeader;
exports.CardHeader.displayName = 'CardHeader';
//# sourceMappingURL=CardHeader.js.map