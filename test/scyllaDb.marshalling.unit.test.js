import { expect } from 'chai';
import ScyllaDb from '../src/utils/ScyllaDb.js';

describe('ScyllaDb marshalling helpers', () => {
    describe('marshalValue', () => {
        it('should marshal string', () => {
            expect(ScyllaDb.marshalValue('abc')).to.deep.equal({ S: 'abc' });
        });
        it('should marshal number', () => {
            expect(ScyllaDb.marshalValue(123)).to.deep.equal({ N: '123' });
        });
        it('should marshal boolean', () => {
            expect(ScyllaDb.marshalValue(true)).to.deep.equal({ BOOL: true });
        });
        it('should marshal null', () => {
            expect(ScyllaDb.marshalValue(null)).to.deep.equal({ NULL: true });
        });
        it('should marshal array', () => {
            expect(ScyllaDb.marshalValue([1, 'a', false])).to.deep.equal({ L: [{ N: '1' }, { S: 'a' }, { BOOL: false }] });
        });
        it('should marshal object', () => {
            expect(ScyllaDb.marshalValue({ foo: 1, bar: 'baz' })).to.deep.equal({ M: { foo: { N: '1' }, bar: { S: 'baz' } } });
        });
    });

    describe('marshalItem', () => {
        it('should marshal a flat object', () => {
            expect(ScyllaDb.marshalItem({ a: 1, b: 'x', c: false })).to.deep.equal({
                a: { N: '1' },
                b: { S: 'x' },
                c: { BOOL: false },
            });
        });
        it('should marshal nested objects and arrays', () => {
            const input = { foo: [1, 2], bar: { baz: 'x' } };
            expect(ScyllaDb.marshalItem(input)).to.deep.equal({
                foo: { L: [{ N: '1' }, { N: '2' }] },
                bar: { M: { baz: { S: 'x' } } },
            });
        });
    });

    describe('isMarshalledItem', () => {
        it('should return true for marshalled item', () => {
            const marshalled = { a: { S: 'x' }, b: { N: '1' }, c: { BOOL: false } };
            expect(ScyllaDb.isMarshalledItem(marshalled)).to.equal(true);
        });
        it('should return false for plain object', () => {
            expect(ScyllaDb.isMarshalledItem({ a: 1, b: 'x' })).to.equal(false);
        });
    });

    describe('unmarshalItem', () => {
        it('should unmarshal a flat item', () => {
            const marshalled = { a: { N: '1' }, b: { S: 'x' }, c: { BOOL: false } };
            expect(ScyllaDb.unmarshalItem(marshalled)).to.deep.equal({ a: 1, b: 'x', c: false });
        });
        it('should unmarshal nested objects and arrays', () => {
            const marshalled = {
                foo: { L: [{ N: '1' }, { N: '2' }] },
                bar: { M: { baz: { S: 'x' } } },
            };
            expect(ScyllaDb.unmarshalItem(marshalled)).to.deep.equal({ foo: [1, 2], bar: { baz: 'x' } });
        });
    });

    it('should round-trip marshal and unmarshal', () => {
        const original = { a: 1, b: 'x', c: false, d: null, e: [1, 'y'], f: { g: 2 } };
        const marshalled = ScyllaDb.marshalItem(original);
        const unmarshalled = ScyllaDb.unmarshalItem(marshalled);
        expect(unmarshalled).to.deep.equal(original);
    });
}); 