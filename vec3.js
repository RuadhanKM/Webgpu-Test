const vec3 = {
    add(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
    },
    sub(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    },
    mul(a, b) {
        if (b instanceof Array) return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]
        return [a[0] * b, a[1] * b, a[2] * b]
    },
    div(a, b) {
        if (b instanceof Array) return [a[0] / b[0], a[1] / b[1], a[2] / b[2]]
        return [a[0] / b, a[1] / b, a[2] / b]
    },

    mag(a) {
        return Math.sqrt(vec3.dot(a, a))
    },

    norm(a) {
        return vec3.div(a, vec3.mag(a))
    },

    dis(a, b) {
        return vec3.mag(vec3.sub(a, b))
    },

    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    },
}