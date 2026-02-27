import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children, Component, createRef, Fragment } from 'react';
import styles from '@patternfly/react-styles/css/components/Label/label-group.mjs';
import labelStyles from '@patternfly/react-styles/css/components/Label/label.mjs';
import { css } from '@patternfly/react-styles';
import { Button } from '../Button';
import { Label } from './Label';
import { Tooltip } from '../Tooltip';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import { fillTemplate } from '../../helpers';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
class LabelGroup extends Component {
    constructor(props) {
        super(props);
        this.headingRef = createRef();
        this.toggleCollapse = () => {
            this.setState((prevState) => ({
                isOpen: !prevState.isOpen,
                isTooltipVisible: Boolean(this.headingRef.current && this.headingRef.current.offsetWidth < this.headingRef.current.scrollWidth)
            }));
        };
        this.state = {
            isOpen: this.props.defaultIsOpen,
            isTooltipVisible: false
        };
    }
    componentDidMount() {
        this.setState({
            isTooltipVisible: Boolean(this.headingRef.current && this.headingRef.current.offsetWidth < this.headingRef.current.scrollWidth)
        });
    }
    renderLabel(id) {
        const { categoryName, tooltipPosition } = this.props;
        const { isTooltipVisible } = this.state;
        return isTooltipVisible ? (_jsx(Tooltip, { position: tooltipPosition, content: categoryName, children: _jsx("span", { tabIndex: 0, ref: this.headingRef, className: css(styles.labelGroupLabel), children: _jsx("span", { "aria-hidden": "true", id: id, children: categoryName }) }) })) : (_jsx("span", { ref: this.headingRef, className: css(styles.labelGroupLabel), "aria-hidden": "true", id: id, children: categoryName }));
    }
    render() {
        const _a = this.props, { categoryName, children, className, isClosable, isCompact, closeBtnAriaLabel, 'aria-label': ariaLabel, onClick, numLabels, expandedText, collapsedText, 
        /* eslint-disable @typescript-eslint/no-unused-vars */
        defaultIsOpen, tooltipPosition, isVertical, isEditable, hasEditableTextArea, editableTextAreaProps, addLabelControl } = _a, 
        /* eslint-enable @typescript-eslint/no-unused-vars */
        rest = __rest(_a, ["categoryName", "children", "className", "isClosable", "isCompact", "closeBtnAriaLabel", 'aria-label', "onClick", "numLabels", "expandedText", "collapsedText", "defaultIsOpen", "tooltipPosition", "isVertical", "isEditable", "hasEditableTextArea", "editableTextAreaProps", "addLabelControl"]);
        const { isOpen } = this.state;
        const renderedChildren = Children.toArray(children);
        const numChildren = renderedChildren.length;
        const collapsedTextResult = fillTemplate(collapsedText, {
            remaining: numChildren - numLabels
        });
        const renderLabelGroup = (id) => {
            const labelArray = !isOpen ? renderedChildren.slice(0, numLabels) : renderedChildren;
            const content = (_jsxs(Fragment, { children: [categoryName && this.renderLabel(id), _jsxs("ul", Object.assign({ className: css(styles.labelGroupList) }, (categoryName && { 'aria-labelledby': id }), (!categoryName && { 'aria-label': ariaLabel }), { role: "list" }, rest, { children: [labelArray.map((child, i) => (_jsx("li", { className: css(styles.labelGroupListItem), children: child }, i))), numChildren > numLabels && (_jsx("li", { className: css(styles.labelGroupListItem), children: _jsx(Label, { variant: "overflow", onClick: this.toggleCollapse, className: css(isCompact && labelStyles.modifiers.compact), children: isOpen ? expandedText : collapsedTextResult }) })), addLabelControl && _jsx("li", { className: css(styles.labelGroupListItem), children: addLabelControl }), isEditable && hasEditableTextArea && (_jsx("li", { className: css(styles.labelGroupListItem, styles.modifiers.textarea), children: _jsx("textarea", Object.assign({ className: css(styles.labelGroupTextarea), rows: 1, tabIndex: 0 }, editableTextAreaProps)) }))] }))] }));
            const close = (_jsx("div", { className: css(styles.labelGroupClose), children: _jsx(Button, { variant: "plain", size: "sm", "aria-label": closeBtnAriaLabel, onClick: onClick, id: `remove_group_${id}`, "aria-labelledby": `remove_group_${id} ${id}`, icon: _jsx(TimesIcon, {}) }) }));
            return (_jsxs("div", { className: css(styles.labelGroup, className, categoryName && styles.modifiers.category, isVertical && styles.modifiers.vertical, isEditable && styles.modifiers.editable), children: [_jsx("div", { className: css(styles.labelGroupMain), children: content }), isClosable && close] }));
        };
        return numChildren === 0 && addLabelControl === undefined ? null : (_jsx(GenerateId, { children: (randomId) => renderLabelGroup(this.props.id || randomId) }));
    }
}
LabelGroup.displayName = 'LabelGroup';
LabelGroup.defaultProps = {
    expandedText: 'Show Less',
    collapsedText: '${remaining} more',
    categoryName: '',
    defaultIsOpen: false,
    numLabels: 3,
    isClosable: false,
    isCompact: false,
    onClick: (_e) => undefined,
    closeBtnAriaLabel: 'Close label group',
    tooltipPosition: 'top',
    'aria-label': 'Label group category',
    isVertical: false,
    isEditable: false,
    hasEditableTextArea: false
};
export { LabelGroup };
//# sourceMappingURL=LabelGroup.js.map