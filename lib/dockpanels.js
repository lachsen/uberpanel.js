(function(ns) {

    /**
     * Helper Methods
     */
    function getNodeData(domNode, key) {
        if(domNode.dataset)
            return domNode.dataset[key];
        else
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


    /**
     * A DockPanel container that includes severals panels that can be docked
     * @param domNode
     * @constructor
     */
    var DockPanelContainer = function(divNode) {
        this.divNode = divNode;
        this.dockPanels = [];
        this.left = (getNodeData(divNode, "dockpanel") == "left");
        this.init();
        this.reorderPanels();
    }

    DockPanelContainer.prototype = {
        init: function() {
            addClass(this.divNode, "dkplContainer");
            addClass(this.divNode, this.left ? "dkplLeft" : "dkplRight");
            var childLists = this.divNode.querySelectorAll("li");
            for(var i = 0; i < childLists.length; ++i) {
                this.dockPanels.push(new DockPanel(childLists[i]));
            }

        },

        resizeFixedPanels: function(){},

        reorderPanels: function(){
            var height = 0;
            for(var i = 0; i < this.dockPanels.length; ++i){
                this.dockPanels[i].setPosY(height);
                height += this.dockPanels[i].getHeight();
            }
            setStylePixel(this.divNode, 'height', height);
        }

    };

    var c_panelInnerStylePaddingY;
    function initStylePadding(panel){
        c_panelInnerStylePaddingY = panel.liNode.offsetHeight;
        c_panelInnerStylePaddingY -= panel.headerNode.offsetHeight;
        c_panelInnerStylePaddingY -= panel.editorNode.offsetHeight;
    }


    var DockPanel = function(liNode) {
        this.liNode = liNode;
        this.headerNode = null;
        this.editorNode = null;
        this.fixHeight = hasNodeData(liNode, "fix-height");
        this.userHeight = 0;
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

        },
        createDomNodes: function(){
            this.headerNode = document.createElement("div");
            addClass(this.headerNode, "dkplHeader");
            this.headerNode.innerHTML = getNodeData(this.liNode, 'editor');
            this.editorNode = document.createElement("div");
            addClass(this.editorNode, "dkplEditor");
            while(this.liNode.firstChild)
                this.editorNode.appendChild(this.liNode.firstChild);


            var scrollBar = document.createElement("div");
            addClass(scrollBar, "dkplVerticalBar");
            this.liNode.appendChild(scrollBar);

            scrollBar = document.createElement("div");
            addClass(scrollBar, "dkplHorizontalBar");
            this.liNode.appendChild(scrollBar);

            this.liNode.appendChild(this.headerNode);
            this.liNode.appendChild(this.editorNode);
        },
        setPosY: function(y){
            setStylePixel(this.liNode, 'top', y);
        },
        setHeight: function(height){
            var editorHeight = height - this.headerNode.offsetHeight - c_panelInnerStylePaddingY;
            setStylePixel(this.editorNode, "height", editorHeight);
        },
        setWidth: function(width){
            setStylePixel(this.liNode, "width", width);
        },

        getHeight: function(){
            return this.liNode.offsetHeight;
        }
    };



    var DragManager = {
        init: function(){

        },
        dragMoveListener: null,
        dragEndListener: null,
        onMouseMove: function(){

        },
        onMouseUp: function(){

        }

    }



    var c_panelContainers = [];

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

