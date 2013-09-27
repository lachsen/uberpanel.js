(function(ns) {

    /**
     * Helper Methods
     */
    function getNodeData(domNode, key) {
        return domNode.getAttribute("data-" + key);
    }

    function hasNodeData(domNode, key){
        return domNode.hasAttribute("data-" + key);
    }

    function setStylePixel(domNode, key, number){
        domNode.style[key] = number + "px";
    }
    function getStylePixel(domNode, key){
        return parseInt(domNode.style[key].replace(/[^-\d\.]/g, ''));
    }

    function addClass(domNode, className){
        var oldName = domNode.className;
        if(oldName.indexOf(className) == -1)
            domNode.className += (oldName ? " " : "") + className;

    }
    function removeClass(domNode, className){
        var oldName = domNode.className;
        var idx = oldName.indexOf(className);
        if(idx != -1 )
            domNode.className = (oldName.substr(0, idx) + oldName.substr(idx + className.length)).trim();
    }

    function getOffset(domElement){
        var result = {left: 0, top: 0};
        while(domElement != null){
            result.left += domElement.offsetLeft;
            result.top += domElement.offsetTop;
            domElement = domElement.offsetParent;
        }
        return result;
    }


    /**
     * A DockPanel container that includes severals panels that can be docked
     * @param domNode
     * @constructor
     */
    var DockPanelContainer = function(divNode) {
        this.divNode = divNode;
        this.highlightNode = null;
        this.dockPanels = [];
        this.left = (getNodeData(divNode, "dockpanel") == "left");
        this.horizontalFlowWidth = getNodeData(divNode, "horizontal-flow-width") || 0;

        this.init();
        this.reorderPanels();
    }

    DockPanelContainer.prototype = {
        init: function() {
            addClass(this.divNode, "dkplContainer");
            addClass(this.divNode, this.left ? "dkplLeft" : "dkplRight");

            this.highlightNode = document.createElement("div");
            addClass(this.highlightNode, "dkplHighlight");
            this.divNode.appendChild(this.highlightNode);
            this.highlightNode.style.display = 'none';


            var childLists = this.divNode.querySelectorAll("li");
            for(var i = 0; i < childLists.length; ++i) {
                this.dockPanels.push(new DockPanel(this, childLists[i]));
            }
        },

        placePanel: function(index, panel){
            var prevContainer = panel.container;

            var prevIndex = prevContainer.dockPanels.indexOf(panel);
            prevContainer.dockPanels.splice(prevIndex,1);


            panel.clearPos();
            panel.container = this;
            var list = this.divNode.querySelector("ul");
            if(index < this.dockPanels.length){
                list.insertBefore(panel.liNode, this.dockPanels[index].liNode);
                this.dockPanels.splice(index, 0, panel);
            }
            else{
                list.appendChild(panel.liNode);
                this.dockPanels.push(panel);
            }
            prevContainer.reorderPanels();
            this.reorderPanels();
        },

        reorderPanels: function(){
            var top = 0, left = 0, prevMinPanel = null;
            for(var i = 0; i < this.dockPanels.length; ++i){
                var panel = this.dockPanels[i];
                if(prevMinPanel && (!panel.minimized || left > this.horizontalFlowWidth)){
                    top += prevMinPanel.getHeight();
                    left = 0;
                    prevMinPanel = null;
                }
                if(!panel.minimized) left = 0;
                panel.setPos(left, top);
                if(panel.minimized){
                    prevMinPanel = panel;
                    left += panel.getWidth();
                }
                else{
                    top += panel.getHeight();
                }
            }
        },
        getPlacingIndex: function(event, draggedPanel){
            var parent = this.divNode.parentNode;
            var offset = getOffset(parent);
            var x = event.pageX - offset.left, y = event.pageY - offset.top;
            if(!this.left) x = parent.offsetWidth - x;
            var dest = -1;
            for(var i = 0; i < this.dockPanels.length; ++i){
                var panel = this.dockPanels[i];
                if(panel != draggedPanel){
                    var pos = panel.getPos(), width = panel.getWidth(), height = panel.getHeight();
                    if(pos.x <= x && pos.x + width >= x && pos.y <= y && pos.y + height >= y){
                        if( (!panel.minimized && y < pos.y + height / 2) || (panel.minimized &&
                            x < pos.x + width / 2)){
                            dest = i;
                            break;
                        }
                        else{
                            dest = i+1;
                            break;
                        }
                    }
                }
            }
            if(this.dockPanels[dest] == draggedPanel || this.dockPanels[dest-1] == draggedPanel)
                return -1;
            else
                return dest;
        },
        showPlacingHightlight: function(index, draggedPanel){
            var end = false;
            if( index == this.dockPanels.length || (index > 0 || draggedPanel.minimized != this.dockPanels[index].minimized)){
                end = true; index--;
            }
            var panel = this.dockPanels[index];

            this.highlightNode.style.display = 'block';
            this.highlightNode.style.removeProperty('left');
            this.highlightNode.style.removeProperty('right');
            this.highlightNode.style.removeProperty('width');
            this.highlightNode.style.removeProperty('height');
            var pos = panel.getPos();
            if(panel.minimized){
                addClass(this.highlightNode, "dkplVertical");
                pos.x += ( end ? panel.getWidth() : 0 );
                setStylePixel(this.highlightNode, 'height', panel.getHeight());
            }
            else {
                removeClass(this.highlightNode, "dkplVertical");
                pos.y += ( end ? panel.getHeight() : 0 );
                setStylePixel(this.highlightNode, 'width', panel.getWidth());
            }
            setStylePixel(this.highlightNode, this.left ? 'left' : 'right', pos.x);
            setStylePixel(this.highlightNode, 'top', pos.y);
        },
        clearPlacingHightlight: function(){
            this.highlightNode.style.display = 'none';
        }

    };

    var c_panelInnerStylePaddingY;
    function initStylePadding(panel){
        c_panelInnerStylePaddingY = panel.liNode.offsetHeight;
        c_panelInnerStylePaddingY -= panel.headerNode.offsetHeight;
        c_panelInnerStylePaddingY -= panel.editorNode.offsetHeight;
    }


    var DockPanel = function(container, liNode) {
        this.container = container;
        this.liNode = liNode;
        this.headerNode = null;
        this.editorNode = null;
        this.minimized = false;
        this.fixHeight = hasNodeData(liNode, "fix-height");
        this.width = this.getWidth();
        this.height = this.getHeight();
        this.init();
    }

    DockPanel.prototype = {
        init: function(){
            addClass(this.liNode, "dkplPanel");
            if(this.fixHeight)
                addClass(this.liNode, "dkplFixed");
            this.createDomNodes();
            if(c_panelInnerStylePaddingY == undefined)
                initStylePadding(this);
            if(!this.fixHeight) {
                this.setWidth(300);
                this.setHeight(100);
            }
            else{
                this.setWidth(this.getWidth());
            }
        },
        createDomNodes: function(){
            var self = this;

            this.headerNode = document.createElement("div");
            addClass(this.headerNode, "dkplHeader");
            this.headerNode.innerHTML = getNodeData(this.liNode, 'editor');
            this.headerNode.addEventListener("mousedown", function(e){
                return DragManager.startDrag("dragPanel", e, self)
            });


            this.editorNode = document.createElement("div");
            addClass(this.editorNode, "dkplEditor");
            while(this.liNode.firstChild)
                this.editorNode.appendChild(this.liNode.firstChild);

            var scrollBar = document.createElement("div");
            addClass(scrollBar, "dkplVerticalBar");
            this.liNode.appendChild(scrollBar);
            scrollBar.addEventListener("mousedown", function(e){
                return DragManager.startDrag("dragWidth", e, self)
            });

            if(!this.fixHeight){
                scrollBar = document.createElement("div");
                addClass(scrollBar, "dkplHorizontalBar");
                this.liNode.appendChild(scrollBar);
                scrollBar.addEventListener("mousedown", function(e){
                    return DragManager.startDrag("dragHeight", e, self)
                });
            }
            this.liNode.appendChild(this.headerNode);
            this.liNode.appendChild(this.editorNode);
        },
        setMinimized: function(minimized){
            if(this.minimized == minimized)
                return;
            this.minimized = minimized;
            if(this.minimized)
                addClass(this.liNode, "dkplMinimized");
            else
                removeClass(this.liNode, "dkplMinimized");
            if(this.minimized){
                this.liNode.style.removeProperty('width');
            }
            else{
                this.setWidth(this.width);
            }
        },

        clearPos: function(){
            this.liNode.style.removeProperty('left');
            this.liNode.style.removeProperty('right');
            this.liNode.style.removeProperty('top');
        },

        getPos: function(){
            return {
                x : getStylePixel(this.liNode, this.container.left ? 'left' : 'right'),
                y: getStylePixel(this.liNode, 'top')
            };
        },

        setPos: function(x, y){
            this.liNode.style.removeProperty('left');
            this.liNode.style.removeProperty('right');
            setStylePixel(this.liNode, this.container.left ? 'left' : 'right', x);
            setStylePixel(this.liNode, 'top', y);
        },


        getWidth: function(){
            return this.liNode.offsetWidth;
        },


        setWidth: function(width){
            var width = Math.max(120, width);
            setStylePixel(this.liNode, "width", width);
            this.width = width;
            this.container.reorderPanels();
        },

        getHeight: function(){
            return this.liNode.offsetHeight;
        },

        setHeight: function(height){
            if(this.fixHeight) return;
            this.height = height;
            var editorHeight = height - this.headerNode.offsetHeight - c_panelInnerStylePaddingY;
            setStylePixel(this.editorNode, "height", editorHeight);
            this.container.reorderPanels();
        }


    };



    var DragManager = {
        dragEntries: {},
        currentDrag: null,
        currentDragData: null,

        init: function(){
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('mouseup', this.onMouseUp);
        },
        addDrag: function(name, onPush, onMove, onRelease){
            DragManager.dragEntries[name] = {
                onPush: onPush,
                onMove: onMove,
                onRelease: onRelease
            }
        },
        startDrag: function(name, event){
            DragManager.currentDrag = DragManager.dragEntries[name];
            DragManager.currentDragData = {};

            var args = Array.prototype.slice.call(arguments,1);
            args.unshift(DragManager.currentDragData);
            DragManager.currentDrag.onPush.apply(null, args);
            event.preventDefault();
            return false;
        },
        onMouseMove: function(e){
            if(DragManager.currentDrag){
                e.preventDefault();
                DragManager.currentDrag.onMove(DragManager.currentDragData, e);
                return false;
            }
        },
        onMouseUp: function(e){
            if(DragManager.currentDrag){
                e.preventDefault();
                if(DragManager.currentDrag.onRelease)
                    DragManager.currentDrag.onRelease(DragManager.currentDragData, e);
                DragManager.currentDrag = null;
                return false;
            }
        }
    }
    DragManager.init();
    DragManager.addDrag("dragWidth",
        function(data, event, dragPanel){
            data.startX = event.clientX;
            data.dragPanel = dragPanel;
            data.startWidth = dragPanel.getWidth();
            data.left = dragPanel.container.left;
            addClass(dragPanel.liNode, "verticalDrag");
            addClass(dragPanel.container.divNode, "dkplDragging");
        },
        function(data, event){
            var delta = event.clientX - data.startX;
            data.dragPanel.setWidth(data.startWidth + (data.left ? delta : -delta));
        },
        function(data, event){
            removeClass(data.dragPanel.liNode, "verticalDrag");
            removeClass(data.dragPanel.container.divNode, "dkplDragging");
        }
    );
    DragManager.addDrag("dragHeight",
        function(data, event, dragPanel){
            data.startY = event.clientY;
            data.dragPanel = dragPanel;
            data.startHeight = dragPanel.getHeight();
            addClass(dragPanel.liNode, "horizontalDrag");
            addClass(dragPanel.container.divNode, "dkplDragging");
        },
        function(data, event){
            var delta = event.clientY - data.startY;
            data.dragPanel.setHeight(data.startHeight + delta);
        },
        function(data, event){
            removeClass(data.dragPanel.liNode, "horizontalDrag");
            removeClass(data.dragPanel.container.divNode, "dkplDragging");
        }
    );
    DragManager.addDrag("dragPanel",
        function(data, event, dragPanel){
            data.startX = event.clientX; data.startY = event.clientY;
            data.startPos = dragPanel.getPos();
            data.panelLeft = getStylePixel(dragPanel.liNode, 'left');
            data.panelTop = getStylePixel(dragPanel.liNode, 'top');
            data.left = dragPanel.container.left;
            data.dragPanel = dragPanel;
            data.moved = false;
        },
        function(data, event){
            var deltaY = event.clientY - data.startY;
            var deltaX = event.clientX - data.startX;
            if(!data.moved && Math.abs(deltaY) + Math.abs(deltaX) > 12 ){
               addClass(data.dragPanel.liNode, "dkplPlacing");
               addClass(data.dragPanel.container.divNode, "dkplDragging");
               data.moved = true;
            }

            if(data.moved){
                if(!data.left) deltaX = -deltaX;
                data.dragPanel.setPos(data.startPos.x + deltaX, data.startPos.y + deltaY);
                handleDockPlacementHighlight(event, data.dragPanel);
            }


        },
        function(data, event){
            if(!data.moved){
                data.dragPanel.setMinimized(!data.dragPanel.minimized);
                data.dragPanel.container.reorderPanels();
            }
            else{
                removeClass(data.dragPanel.liNode, "dkplPlacing");
                removeClass(data.dragPanel.container.divNode, "dkplDragging");
                data.dragPanel.container.reorderPanels();
                resolveDockPlacement(event, data.dragPanel);
            }
        }
    );



    var c_panelContainers = [];

    function handleDockPlacementHighlight(event, draggedPanel){
        for(var i = 0; i < c_panelContainers.length; ++i){
            var idx = c_panelContainers[i].getPlacingIndex(event, draggedPanel);
            if(idx != -1)
                c_panelContainers[i].showPlacingHightlight(idx, draggedPanel);
            else
                c_panelContainers[i].clearPlacingHightlight();
        }
    }
    function resolveDockPlacement(event, draggedPanel){
        var destContainer = null, destIdx = 0;
        for(var i = 0; i < c_panelContainers.length; ++i){
            var idx = c_panelContainers[i].getPlacingIndex(event, draggedPanel);
            if(idx != -1){
                destContainer = c_panelContainers[i];
                destIdx = idx;
            }
            c_panelContainers[i].clearPlacingHightlight();
        }
        destContainer && destContainer.placePanel(destIdx, draggedPanel);
    }



    ns.DockPanels = {
        init: function() {
            var self = this;
            document.addEventListener('DOMContentLoaded', function(){
                var elements = document.querySelectorAll("div[data-dockpanel]");
                for(var i = 0; i < elements.length; ++i) {
                    self.addPanel(elements[i]);
                }
            });
        },



        addPanel: function(divNode) {
            c_panelContainers.push(new DockPanelContainer(divNode));
        }
    }

    ns.DockPanels.init();



}(window));

