export default {
    add(...args) {
        return args.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]])
    },
    sub(...args) {
        return args.reduce((a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]])
    },
    mul(...args) {
        return args.reduce((a, b) => {
            if (b instanceof Array) return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]
            return [a[0] * b, a[1] * b, a[2] * b]
        })
    },
    div(...args) {
        return args.reduce((a, b) => {
            if (b instanceof Array) return [a[0] / b[0], a[1] / b[1], a[2] / b[2]]
            return [a[0] / b, a[1] / b, a[2] / b]
        })
    },

    mag(a) {
        return Math.sqrt(this.dot(a, a))
    },

    norm(a) {
        return this.div(a, this.mag(a))
    },

    dis(a, b) {
        return this.mag(this.sub(a, b))
    },

    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    },

    lerp(a, b, t) {
        return this.add(a, this.mul(this.sub(b, a), t))
    }
}