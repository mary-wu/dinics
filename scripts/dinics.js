
// Nodes are known by 'id', not by index in an array
// Links are always source < target and edge directions are set by 'left' and
// 'right'
// input: 
//   vertex_set: the list of vertices in the graph
//   edge_set  : the list of edges defined by source and target vertex
//               each edge also contains the capacity information
//   source    : the source vertex (implicitly passed via vertex set index 0
//   target    : the sink vertex (implicitly passed via vertex set index 1
// output:
//
function EdmondsKarp(vertex_set, edge_set, cb) {
    "use strict";

    // Copy the edges from the beginning (index=0) to the end (default)
    // and create a map to the source, target and capacity
    edge_set = edge_set.slice(0).map(function(o) {
        return {
            source: o.source,
            target: o.target,
            capacity: o.capacity,
        };
    });


    // Create our variables and initialize the residual graph by mapping
    // a vertex id to an array of their outgoing edges
    var residual_graph = initializeResidualGraph(vertex_set, edge_set),
        path = null,
        log = [];

    var level_graph = initializeLevelGraph(vertex_set);

    // Initialize the level graph for Dinic's
    function initializeLevelGraph(vertex_set) {
        var g = d3.map(), level;

        vertex_set.forEach(function(v) {
            g.set(v.id, -1);
        });

        return g;
    } // end initializeLevelGraph

    // Initialize the residual graph
    function initializeResidualGraph(vertex_set, edge_set) {
        // Create an array for the outgoing and incoming edges
        var g = d3.map(),
            outgoing,
            incoming;
            // level;

        // Initialize each key (the vertex ID) to have an empty outgoing and
        // incoming edge
        vertex_set.forEach(function(v) {
            g.set(v.id, []);
        });

        // Given an edge, this function adds to a graph
        //   backward edges containing the edge capacities as the residual capacities (none used yet!)
        //   forward edges containing the flow rate (initialized to 0)
        edge_set.forEach(function(e) {
            var backward_edge = {target: e.target.id, flow: e.capacity};
            var forward_edge = {target: e.source.id, flow: 0};

            // Initialize
            outgoing = g.get(e.source.id) || [];
            outgoing.push(backward_edge);

            incoming = g.get(e.target.id) || [];
            incoming.push(forward_edge);

            // var level = -1;
            g.set(e.source.id, outgoing);
            g.set(e.target.id, incoming);
            // g.set(e.target.id, level);
        });

        return g;
    } // end initializeResidualGraph


    // This function finds a path from source 's' to sink 't'
    // in the residual graph.
    function findAugmentingPath(residual_graph, n, level_graph) {

        // Constructs the path from s to t from the target node backwards
        // through its parent tree generated using bfs
        function buildPath(parents, target_node) {
            var result = [target_node];

            while (parents[target_node] != null) {
                target_node = parents[target_node];
                result.push(target_node);
            } // end while

            return result.reverse();
        } // end buildPath

        // Performs the breadth-first search for a path from s-t
        function bfs(graph) {
            var parents = [];    // keep track of a node's parent
            var levels = [];
            var queue = [];      // queue for BFS
            var start_node = 0;  // node s
            var target_node = 1; // node t
            var current;

            // Mark the source node as visited with no parent and enqueue it
            queue.push(start_node);
            parents[start_node] = null;

            for (var j=0; j < n; j+=1) {
                levels.push(-1)
            }

            // Source node
            levels[start_node] = 0;
            level_graph.set(start_node, 0);

            // Perform the standard BFS loop
            while (queue.length) {
                // pop off the next node to search on
                current = queue.shift();

                // Consider edges which have nonzero residual flow
                var es = graph.get(current).filter(function(e){return e.flow>0;});

                // If we reached our target node, construct the path
                if (current === target_node) {
                    return buildPath(parents, target_node);
                } // end if

                // Push the next set of nodes
                for (var i=0; i < es.length; i+= 1) {
                    // make sure we are not looping on our self and that we did not visit this
                    // node already
                    if ((es[i].target !== current) && (levels[es[i].target] < 0)) {
                        // mark the node as a parent in the path and as visited
                        parents[es[i].target] = current;
                        levels[es[i].target] = levels[current] + 1;
                        var cur_level = level_graph.get(current);
                        level_graph.set(es[i].target, cur_level+1);

                        // push
                        queue.push(es[i].target);
                    } // end if
                } // end for
            } // end while

            return null;
        } // end bfs

        return bfs(residual_graph);
    } // end findAugmentingPath



// This function finds the bottleneck residual capacity (i.e. the min residual capacity on the augmenting path).
// This function then adjusts the flows by adding the min residual capacity to the forward edges in the residual graph
// and subtrating that value from the backward edges.
    function augment(path, residual_graph, level_graph) {
        function bottleneck(path, residual_graph, level_graph) {
            // return the min residual capacity of any edge on the path.
            path = path.reverse();
            var u = path.pop(),
                min = parseFloat('Infinity');

            for (var v; v = path.pop();) {
                var edge = residual_graph.get(u).filter(function(e) {return e.target === v})[0];
                // if (edge.flow < min) {min = edge.flow;}
                // console.log(level_graph);
                // alert(level_graph.get(1));
                if ((edge.flow < min) && (level_graph.get(v) === (level_graph.get(u)+1))) {min = edge.flow;}

                u = v;
            }
            return min;
        } // end bottleneck

        var b = bottleneck(path.slice(0), residual_graph, level_graph);
        var u = 0;
        path.forEach(function(v) {
            if (u === v) {return;}

            var bEdge = residual_graph.get(u).filter(function(e) {return e.target === v})[0];
            var fEdge = residual_graph.get(v).filter(function(e) {return e.target === u})[0];

            fEdge.flow += b;
            bEdge.flow -= b;

            u = v;
        });
    }// end augment

    // This function Returns [maxflow, edges]
    function makeResidualGraph(residual_graph, vertex_set, edge_set) {

        // Display the result flow
        edge_set.forEach(function(l) {
            var edge = residual_graph.get(l.target.id).filter(function(e) { return e.target === l.source.id})[0];
            l.flow = edge.flow;
        });

        // Calculate the maximum flow
        var sinkIncedent = residual_graph.get(1);
        var total = 0;
        sinkIncedent.forEach(function (e) {
            total += e.flow;
        });

        return {
            maxflow: total,
            vertices: vertex_set,
            links: edge_set
        };
    } // end makeResidualGraph


    // Log the residual graph state so that we can use it when we enter the step view
    function logState(residual_graph, path) {
        var newRG = JSON.parse(JSON.stringify(residual_graph));
        var newGraph = new Graph(vertex_set, edge_set);
        newGraph = Graph.fromJSON( newGraph.toJSON() );
        var newVs = newGraph.nodes(),
            newEs = newGraph.links();

        log.push({
            flow: makeResidualGraph(residual_graph, newVs, newEs),
            residual: newRG,
            path: path
        });
    } // end logState

    // === Main Loop ===

    logState(residual_graph, path);

    var num_vertices = vertex_set.length;

    while (path = findAugmentingPath(residual_graph, num_vertices, level_graph)) {
        // alert(level_graph.get(1));
        augment(path, residual_graph, level_graph);
        logState(residual_graph, path);
    }

    console.debug("Residual Graph flow: ", residual_graph);

    return [makeResidualGraph(residual_graph, vertex_set, edge_set), log];
} // end EdmondsKarp
