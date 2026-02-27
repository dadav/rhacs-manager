"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Droppable = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const drag_drop_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DragDrop/drag-drop"));
const DroppableContext_1 = require("./DroppableContext");
const Droppable = (_a) => {
    var { className, children, zone = 'defaultZone', droppableId = 'defaultId', hasNoWrapper = false } = _a, props = tslib_1.__rest(_a, ["className", "children", "zone", "droppableId", "hasNoWrapper"]);
    const childProps = Object.assign({ 'data-pf-droppable': zone, 'data-pf-droppableid': droppableId, 
        // if has no wrapper is set, don't overwrite children className with the className prop
        className: hasNoWrapper && react_1.Children.count(children) === 1
            ? (0, react_styles_1.css)(drag_drop_1.default.droppable, className, children.props.className)
            : (0, react_styles_1.css)(drag_drop_1.default.droppable, className) }, props);
    return ((0, jsx_runtime_1.jsx)(DroppableContext_1.DroppableContext.Provider, { value: { zone, droppableId }, children: hasNoWrapper ? ((0, react_1.cloneElement)(children, childProps)) : ((0, jsx_runtime_1.jsx)("div", Object.assign({}, childProps, { children: children }))) }));
};
exports.Droppable = Droppable;
exports.Droppable.displayName = 'Droppable';
//# sourceMappingURL=Droppable.js.map